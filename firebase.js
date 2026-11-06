import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig, firebaseConfigured } from "./firebase-config.js";

const text = {
  en: { title:"Cloud account", desc:"Sign in to sync your learning progress across devices.", email:"Email address", password:"Password", signIn:"Sign in", signUp:"Create account", signOut:"Sign out", guest:"Guest mode — data stays on this device.", ready:"Firebase is connected. Sign in to enable cloud sync.", missing:"Add your Firebase web configuration in firebase-config.js to activate cloud services.", syncing:"Syncing…", synced:"Cloud sync complete.", failed:"Cloud sync failed. Your local data is safe.", authError:"Authentication failed. Check your details and Firebase settings.", account:"Signed in as" },
  bn: { title:"ক্লাউড অ্যাকাউন্ট", desc:"একাধিক ডিভাইসে পড়াশোনার অগ্রগতি sync করতে sign in করো।", email:"ইমেইল ঠিকানা", password:"পাসওয়ার্ড", signIn:"সাইন ইন", signUp:"অ্যাকাউন্ট তৈরি", signOut:"সাইন আউট", guest:"Guest mode — ডেটা এই ডিভাইসেই থাকবে।", ready:"Firebase সংযুক্ত। Cloud sync চালু করতে sign in করো।", missing:"Cloud service চালু করতে firebase-config.js-এ Firebase Web configuration যোগ করো।", syncing:"Sync হচ্ছে…", synced:"Cloud sync সম্পন্ন হয়েছে।", failed:"Cloud sync ব্যর্থ। Local data নিরাপদ আছে।", authError:"Authentication ব্যর্থ। তথ্য ও Firebase settings পরীক্ষা করো।", account:"সাইন ইন করা হয়েছে" }
};
let auth, db, currentUser = null, syncTimer = null, busy = false;
const local = key => { try { return JSON.parse(localStorage.getItem("nv_"+key)) ?? null; } catch { return null; } };
const snapshot = () => ({
  progress: local("progress") || { attempts:0, correct:0, history:[] },
  tasks: local("tasks") || [],
  bookmarks: local("bookmarks") || [],
  updatedAt: new Date().toISOString()
});
const ui = () => {
  if (document.getElementById("firebasePanel")) return;
  const profile = document.getElementById("profile");
  if (!profile) return;
  const card = document.createElement("div");
  card.className = "card";
  card.id = "firebasePanel";
  card.style.marginTop = "14px";
  card.innerHTML = `
    <h3 id="fbTitle" style="margin-top:0"></h3>
    <p class="muted" id="fbDesc"></p>
    <div id="fbIdentity" class="muted" style="font-size:13px;margin:8px 0"></div>
    <form id="fbForm">
      <label for="fbEmail" id="fbEmailLabel"></label>
      <input class="field" id="fbEmail" type="email" autocomplete="email" required>
      <label for="fbPassword" id="fbPasswordLabel"></label>
      <input class="field" id="fbPassword" type="password" minlength="6" autocomplete="current-password" required>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="primary" type="submit" id="fbSignIn"></button>
        <button class="secondary" type="button" id="fbSignUp"></button>
        <button class="secondary" type="button" id="fbSignOut" hidden></button>
      </div>
    </form>
    <p id="fbStatus" class="notice" role="status" aria-live="polite"></p>`;
  profile.appendChild(card);
  document.getElementById("fbForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!auth) return;
    setStatus(words().syncing);
    try {
      await signInWithEmailAndPassword(auth, value("fbEmail"), value("fbPassword"));
    } catch (error) { setStatus(authMessage(error), true); }
  });
  document.getElementById("fbSignUp").addEventListener("click", async () => {
    if (!auth) return;
    setStatus(words().syncing);
    try {
      const credential = await createUserWithEmailAndPassword(auth, value("fbEmail"), value("fbPassword"));
      await updateProfile(credential.user, { displayName: value("fbEmail").split("@")[0] });
    } catch (error) { setStatus(authMessage(error), true); }
  });
  document.getElementById("fbSignOut").addEventListener("click", async () => {
    if (auth) await signOut(auth);
  });
  renderAuth();
};
const value = id => document.getElementById(id)?.value.trim() || "";
const words = () => text[localStorage.getItem("nv_lang") === "bn" ? "bn" : "en"];
const setStatus = (message, error=false) => {
  const el = document.getElementById("fbStatus");
  if (el) { el.textContent = message; el.style.border = error ? "1px solid #e05b6b" : "0"; }
};
const authMessage = error => {
  const known = ["auth/invalid-email","auth/weak-password","auth/email-already-in-use","auth/invalid-credential","auth/network-request-failed"];
  return known.includes(error?.code) ? error.message : words().authError;
};
const renderAuth = () => {
  if (!document.getElementById("firebasePanel")) return;
  const w = words();
  document.getElementById("fbTitle").textContent = w.title;
  document.getElementById("fbDesc").textContent = w.desc;
  document.getElementById("fbEmailLabel").textContent = w.email;
  document.getElementById("fbPasswordLabel").textContent = w.password;
  document.getElementById("fbSignIn").textContent = w.signIn;
  document.getElementById("fbSignUp").textContent = w.signUp;
  document.getElementById("fbSignOut").textContent = w.signOut;
  document.getElementById("fbIdentity").textContent = currentUser ? w.account + ": " + currentUser.email : w.guest;
  document.getElementById("fbForm").hidden = !firebaseConfigured || !!currentUser;
  document.getElementById("fbSignOut").hidden = !currentUser;
  if (!firebaseConfigured) setStatus(w.missing);
  else if (!currentUser) setStatus(w.ready);
};
async function syncToCloud() {
  if (!currentUser || !db || busy || !navigator.onLine) return;
  busy = true; setStatus(words().syncing);
  try {
    const ref = doc(db, "users", currentUser.uid, "private", "learningData");
    await setDoc(ref, { ...snapshot(), ownerUid: currentUser.uid, updatedAt: serverTimestamp() });
    setStatus(words().synced);
  } catch (error) {
    console.error("Firebase sync error", error);
    setStatus(words().failed, true);
  } finally { busy = false; }
}
async function restoreCloudData(user) {
  try {
    const ref = doc(db, "users", user.uid, "private", "learningData");
    const result = await getDoc(ref);
    if (result.exists()) {
      const data = result.data();
      if (data.progress) localStorage.setItem("nv_progress", JSON.stringify(data.progress));
      if (data.tasks) localStorage.setItem("nv_tasks", JSON.stringify(data.tasks));
      if (data.bookmarks) localStorage.setItem("nv_bookmarks", JSON.stringify(data.bookmarks));
      window.dispatchEvent(new CustomEvent("nv:cloud-restored"));
    } else {
      await syncToCloud();
    }
    setStatus(words().synced);
  } catch (error) {
    console.error("Firebase restore error", error);
    setStatus(words().failed, true);
  }
}
function scheduleSync() {
  if (!currentUser) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncToCloud, 900);
}
function start() {
  ui();
  if (!firebaseConfigured) { renderAuth(); return; }
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    try {
      db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
    } catch {
      db = getFirestore(app);
    }
    onAuthStateChanged(auth, async user => {
      currentUser = user;
      renderAuth();
      if (user) await restoreCloudData(user);
    });
    window.addEventListener("nv:data", scheduleSync);
    window.addEventListener("online", syncToCloud);
    window.addEventListener("nv:language", renderAuth);
    window.addEventListener("nv:cloud-restored", () => {
      if (typeof window.renderStats === "function") window.renderStats();
      if (typeof window.renderTasks === "function") window.renderTasks();
    });
  } catch (error) {
    console.error("Firebase initialization failed", error);
    setStatus(words().authError, true);
  }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
