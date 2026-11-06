import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-functions.js";
import { firebaseConfig, firebaseConfigured } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const state = { user: null, history: [], busy: false, call: null, db: null };
const copy = {
  en: { title: "NATIONVK AI", subtitle: "Your personal learning assistant", login: "Sign in to your NATIONVK account to use AI.", placeholder: "Ask NATIONVK AI anything…", send: "Send", thinking: "Thinking…", welcome: "Hi! I’m NATIONVK AI. What would you like to learn today?", error: "I couldn't get a reply. Please try again.", saved: "Chat synced to your account." },
  bn: { title: "NATIONVK AI", subtitle: "তোমার ব্যক্তিগত শেখার সহকারী", login: "AI ব্যবহার করতে NATIONVK অ্যাকাউন্টে সাইন ইন করো।", placeholder: "NATIONVK AI-কে কিছু জিজ্ঞেস করো…", send: "পাঠাও", thinking: "ভাবছি…", welcome: "হ্যালো! আমি NATIONVK AI। আজ কী শিখতে চাও?", error: "উত্তর পাওয়া যায়নি। আবার চেষ্টা করো।", saved: "চ্যাট অ্যাকাউন্টে sync হয়েছে।" }
};
const words = () => copy[localStorage.getItem("nv_lang") === "bn" ? "bn" : "en"];

function render() {
  const w = words();
  $("aiTitle").textContent = w.title;
  $("aiSubtitle").textContent = w.subtitle;
  $("aiInput").placeholder = w.placeholder;
  $("aiSend").textContent = state.busy ? w.thinking : w.send;
  $("aiSend").disabled = state.busy;
  $("aiLoginNote").textContent = !firebaseConfigured || !state.user ? w.login : "";
  $("aiInput").disabled = !firebaseConfigured || !state.user || state.busy;
  $("aiSend").disabled = !firebaseConfigured || !state.user || state.busy;
  $("aiMessages").innerHTML = "";
  if (!state.history.length) addBubble(w.welcome, "assistant");
  else state.history.forEach((message) => addBubble(message.content, message.role));
}
function addBubble(message, role) {
  const bubble = document.createElement("div");
  bubble.className = "ai-bubble " + role;
  bubble.textContent = message;
  $("aiMessages").appendChild(bubble);
  $("aiMessages").scrollTop = $("aiMessages").scrollHeight;
}
async function saveHistory() {
  if (!state.user || !state.db) return;
  const ref = doc(state.db, "users", state.user.uid, "private", "aiChat");
  await setDoc(ref, { messages: state.history.slice(-30), updatedAt: serverTimestamp() }, { merge: true });
}
async function loadHistory(user) {
  state.history = [];
  try {
    const ref = doc(state.db, "users", user.uid, "private", "aiChat");
    const snapshot = await getDoc(ref);
    const messages = snapshot.exists() ? snapshot.data().messages : [];
    if (Array.isArray(messages)) {
      state.history = messages.filter((m) => ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-30);
    }
  } catch (error) {
    console.warn("Could not restore AI chat history", error);
  }
  render();
}
async function send() {
  const input = $("aiInput");
  const content = input.value.trim();
  if (!content || state.busy || !state.user || !state.call) return;
  state.history.push({ role: "user", content });
  state.history = state.history.slice(-30);
  input.value = "";
  state.busy = true;
  render();
  try {
    const result = await state.call({ messages: state.history.slice(-16) });
    state.history.push({ role: "assistant", content: result.data.answer });
    state.history = state.history.slice(-30);
    await saveHistory();
  } catch (error) {
    console.error("NATIONVK AI error", error);
    state.history.push({ role: "assistant", content: words().error });
  } finally {
    state.busy = false;
    render();
  }
}

window.NATIONVK_AI = {
  open() { $("aiPanel").hidden = false; $("aiInput").focus(); },
  close() { $("aiPanel").hidden = true; }
};
$("aiOpen").addEventListener("click", window.NATIONVK_AI.open);
$("aiClose").addEventListener("click", window.NATIONVK_AI.close);
$("aiSend").addEventListener("click", send);
$("aiInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); }
});

if (firebaseConfigured) {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    state.db = getFirestore(app);
    state.call = httpsCallable(getFunctions(app, "us-central1"), "nationvkTutor");
    onAuthStateChanged(auth, async (user) => {
      state.user = user;
      if (user) await loadHistory(user);
      else { state.history = []; render(); }
    });
  } catch (error) {
    console.error("NATIONVK AI setup failed", error);
  }
}
window.addEventListener("nv:language", render);
render();
