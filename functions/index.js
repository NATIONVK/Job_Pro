const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const openAiApiKey = defineSecret("OPENAI_API_KEY");
const MODEL = "gpt-4.1-mini";

exports.nationvkTutor = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: [openAiApiKey]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to use NATIONVK AI.");
    }

    const uid = request.auth.uid;
    const dayKey = new Date().toISOString().slice(0, 10);
    const usageRef = admin.firestore().collection("_nationvkAiUsage").doc(uid);
    const allowed = await admin.firestore().runTransaction(async (transaction) => {
      const usageSnapshot = await transaction.get(usageRef);
      const usage = usageSnapshot.data() || {};
      const count = usage.day === dayKey ? Number(usage.count || 0) : 0;
      if (count >= 25) return false;
      transaction.set(usageRef, {
        day: dayKey,
        count: count + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    });
    if (!allowed) {
      throw new HttpsError("resource-exhausted", "Daily NATIONVK AI limit reached. Try again tomorrow.");
    }

    const incoming = request.data?.messages;
    if (!Array.isArray(incoming) || incoming.length < 1 || incoming.length > 16) {
      throw new HttpsError("invalid-argument", "Send between 1 and 16 chat messages.");
    }

    const messages = incoming.map((item) => {
      const role = item?.role;
      const content = typeof item?.content === "string" ? item.content.trim() : "";
      if (!["user", "assistant"].includes(role) || !content || content.length > 4000) {
        throw new HttpsError("invalid-argument", "A chat message is invalid or too long.");
      }
      return { role, content };
    });

    if (messages[messages.length - 1].role !== "user") {
      throw new HttpsError("invalid-argument", "The latest message must be from the user.");
    }

    const systemInstruction = [
      "You are NATIONVK AI, the learning assistant inside NATIONVK Learn.",
      "Help with learning, explanations, practice, study planning, and general questions.",
      "When the user writes Bangla, answer in natural Bangla; when English, answer in English.",
      "Explain difficult ideas step by step and never claim to have accessed private user data unless it is included in the conversation.",
      "Be honest about uncertainty. Do not present yourself as the ChatGPT app or claim access to the user's ChatGPT account."
    ].join(" ");

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAiApiKey.value()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          instructions: systemInstruction,
          input: messages,
          max_output_tokens: 700
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        logger.error("NATIONVK AI provider request failed", {
          uid: request.auth.uid,
          status: response.status,
          providerError: payload.error?.code || "unknown"
        });
        throw new HttpsError("unavailable", "NATIONVK AI is temporarily unavailable. Try again later.");
      }

      const answer = (payload.output || [])
        .flatMap((item) => item.content || [])
        .filter((part) => part.type === "output_text")
        .map((part) => part.text || "")
        .join("\n")
        .trim();

      if (!answer) {
        throw new HttpsError("internal", "The AI returned an empty response.");
      }

      return { answer, model: MODEL };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("NATIONVK AI request crashed", { uid: request.auth.uid });
      throw new HttpsError("unavailable", "Could not reach NATIONVK AI. Check your connection and try again.");
    }
  }
);


exports.generateQuestionDrafts = onCall(
  { region: "us-central1", timeoutSeconds: 90, memory: "512MiB", secrets: [openAiApiKey] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
    if (request.auth.token.admin !== true) throw new HttpsError("permission-denied", "Question admin role required.");
    const { subject, topic, count, language, difficulty } = request.data || {};
    const n = Number(count);
    if (typeof subject !== "string" || !subject.trim() || typeof topic !== "string" || !topic.trim() ||
        !Number.isInteger(n) || n < 1 || n > 20 || !["en","bn","both"].includes(language) ||
        !["Easy","Medium","Hard","Mixed"].includes(difficulty)) {
      throw new HttpsError("invalid-argument", "Invalid question generation settings.");
    }
    const ref = admin.firestore().collection("_nationvkQuestionAiUsage").doc(request.auth.uid);
    const day = new Date().toISOString().slice(0,10);
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref), data = snap.data() || {};
      const used = data.day === day ? Number(data.count || 0) : 0;
      if (used >= 10) return false;
      tx.set(ref,{day,count:used+1,updatedAt:admin.firestore.FieldValue.serverTimestamp()});
      return true;
    });
    if (!allowed) throw new HttpsError("resource-exhausted", "Daily AI question generation limit is 10.");
    const instructions = [
      "Create original educational MCQ questions. Return ONLY valid JSON, no markdown.",
      'JSON shape: {"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","difficulty":"Easy","language":"en"}]}',
      "Each question must have exactly four distinct options and one correct answer. No duplicates. Do not invent uncertain facts.",
      "All generated questions are drafts and must be reviewed by a human before publishing."
    ].join(" ");
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method:"POST",
        headers:{"Authorization":`Bearer ${openAiApiKey.value()}`,"Content-Type":"application/json"},
        body:JSON.stringify({model:MODEL,instructions,input:JSON.stringify({subject:subject.trim(),topic:topic.trim(),count:n,language,difficulty}),max_output_tokens:5000})
      });
      const payload = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error("AI provider request failed.");
      const raw = (payload.output || []).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("\\n").trim();
      const parsed = JSON.parse(raw.replace(/^```json\s*/i,"").replace(/\s*```$/,""));
      if (!Array.isArray(parsed.questions) || parsed.questions.length < 1 || parsed.questions.length > n) throw new Error("Invalid AI response.");
      const questions = parsed.questions.map(q=>{
        if (!q || typeof q.question !== "string" || !Array.isArray(q.options) || q.options.length !== 4 ||
            q.options.some(x=>typeof x!=="string" || !x.trim()) || !Number.isInteger(q.correctIndex) || q.correctIndex<0 || q.correctIndex>3) throw new Error("Invalid generated question.");
        return {subject:subject.trim(),topic:topic.trim(),question:q.question.slice(0,1200),options:q.options.map(x=>x.slice(0,300)),correctIndex:q.correctIndex,explanation:String(q.explanation||"").slice(0,1200),difficulty:["Easy","Medium","Hard"].includes(q.difficulty)?q.difficulty:"Medium",language,published:false};
      });
      return {questions};
    } catch (error) {
      logger.error("Question generation failed",{uid:request.auth.uid});
      throw new HttpsError("internal","AI did not return valid question data. Please retry.");
    }
  }
);
