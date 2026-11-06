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

let auth, db, currentUser = null, syncTimer = null, busy = false;
let authMode = "login", authReady = false;
const local = key => { try { return JSON.parse(localStorage.getItem("nv_"+key)) ?? null; } catch { return null; } };
const words = () => localStorage.getItem("nv_lang") === "bn";
const copy = () => words() ? {
  brand:"JOB_PRO", eyebrow:"তোমার শেখার যাত্রা শুরু হোক", title:"স্বাগতম!",
  desc:"তোমার অ্যাকাউন্টে প্রবেশ করো অথবা নতুন অ্যাকাউন্ট তৈরি করো।",
  name:"তোমার নাম", email:"ইমেইল ঠিকানা", password:"পাসওয়ার্ড",
  login:"লগইন", register:"অ্যাকাউন্ট তৈরি", switchLogin:"আগে থেকেই অ্যাকাউন্ট আছে? লগইন",
  switchRegister:"নতুন এখানে? অ্যাকাউন্ট তৈরি করো", loading:"একটু অপেক্ষা করো…",
  config:"Firebase সেটআপ সম্পূর্ণ হয়নি। firebase-config.js এবং Authentication settings পরীক্ষা করো।",
  tagline:"একবার লগইন করলেই হবে — পরেরবার অ্যাপ খুললে স্বয়ংক্রিয়ভাবে প্রবেশ করবে।",
  welcome:"স্বাগতম", signout:"লগআউট", signed:"লগইন করা হয়েছে",
  errors:{
    "auth/invalid-email":"সঠিক ইমেইল ঠিকানা দাও।",
    "auth/weak-password":"পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।",
    "auth/email-already-in-use":"এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে। লগইন করো।",
    "auth/invalid-credential":"ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
    "auth/network-request-failed":"ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো।",
    "auth/operation-not-allowed":"Firebase Console-এ Email/Password চালু করো।",
    "auth/unauthorized-domain":"Firebase Authentication-এর Authorized domains-এ অ্যাপের domain যোগ করো।",
    "auth/too-many-requests":"অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করো।"
  }
} : {
  brand:"JOB_PRO", eyebrow:"YOUR LEARNING JOURNEY STARTS HERE", title:"Welcome back",
  desc:"Sign in to your account or create a new one to continue.",
  name:"Your name", email:"Email address", password:"Password",
  login:"Sign in", register:"Create account", switchLogin:"Already have an account? Sign in",
  switchRegister:"New here? Create an account", loading:"Please wait…",
  config:"Firebase setup is incomplete. Check firebase-config.js and Authentication settings.",
  tagline:"Sign in once. The app will remember you on this device.",
  welcome:"Welcome", signout:"Sign out", signed:"Signed in",
  errors:{
    "auth/invalid-email":"Enter a valid email address.",
    "auth/weak-password":"Password must be at least 6 characters.",
    "auth/email-already-in-use":"An account already exists for this email. Please sign in.",
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/network-request-failed":"Check your internet connection and try again.",
    "auth/operation-not-allowed":"Enable Email/Password in Firebase Console.",
    "auth/unauthorized-domain":"Add this app domain in Firebase Authentication authorized domains.",
    "auth/too-many-requests":"Too many attempts. Try again later."
  }
};
const snapshot = () => ({
  progress: local("progress") || { attempts:0, correct:0, history:[] },
  tasks: local("tasks") || [], bookmarks: local("bookmarks") || [],
  updatedAt: new Date().toISOString()
});
function injectStyles() {
  if (document.getElementById("jp-auth-styles")) return;
  const style = document.createElement("style");
  style.id = "jp-auth-styles";
  style.textContent = `
    body.jp-auth-pending .app, body.jp-auth-locked .app { visibility:hidden; }
    #jpAuthGate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:radial-gradient(ellipse at 15% 10%,#273b78 0,transparent 42%),radial-gradient(ellipse at 90% 90%,#075e68 0,transparent 40%),linear-gradient(145deg,#080f20,#111b36 58%,#10172a);color:#f7f8ff;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;overflow:auto}
    #jpAuthGate[hidden]{display:none}
    .jp-auth-wrap{width:min(100%,440px);margin:auto}
    .jp-auth-brand{display:flex;align-items:center;gap:12px;margin:0 0 22px 4px}
    .jp-auth-logo{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#7b6cff,#18c6b2);font-weight:950;font-size:22px;box-shadow:0 9px 30px #6257e866}
    .jp-auth-brand b{font-size:18px;letter-spacing:1.5px}.jp-auth-brand small{display:block;color:#aab7d2;font-size:10px;letter-spacing:2px}
    .jp-auth-card{padding:clamp(22px,6vw,34px);border:1px solid #ffffff20;border-radius:26px;background:linear-gradient(145deg,#182541eF,#101a30f2);box-shadow:0 28px 90px #0008;backdrop-filter:blur(18px)}
    .jp-auth-eyebrow{color:#8ee7dd;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase}
    .jp-auth-card h1{font-size:clamp(29px,7vw,37px);line-height:1.12;margin:9px 0}
    .jp-auth-desc{color:#aebbd4;font-size:13px;line-height:1.7;margin:0 0 23px}
    .jp-auth-field{display:block;margin:13px 0 0;color:#dce5f8;font-size:12px;font-weight:700}
    .jp-auth-field input{display:block;width:100%;margin-top:7px;padding:14px 15px;border:1px solid #ffffff24;border-radius:13px;background:#0b1427;color:#fff;outline:none;font:inherit;font-size:14px;min-height:49px}
    .jp-auth-field input:focus{border-color:#8c82ff;box-shadow:0 0 0 3px #8074ff25}
    .jp-auth-primary{width:100%;min-height:50px;margin-top:21px;border:0;border-radius:14px;background:linear-gradient(100deg,#6559ed,#8b65f5 55%,#18b8a9);color:white;font-size:14px;font-weight:850;box-shadow:0 10px 25px #6257e844}
    .jp-auth-primary:disabled{opacity:.6}
    .jp-auth-switch{width:100%;margin-top:14px;padding:10px;background:transparent;border:0;color:#bdb8ff;font-size:12px;font-weight:700}
    .jp-auth-note{margin:15px 0 0;padding:11px 12px;border-radius:12px;background:#ffffff0b;color:#aebbd4;font-size:11px;line-height:1.6;text-align:center}
    #jpAuthStatus{min-height:18px;margin:12px 0 0;color:#ffb7c1;font-size:12px;line-height:1.5}
    .jp-auth-user{font-size:13px;color:#b9c6df;margin:10px 0}
    @media(max-height:650px){#jpAuthGate{align-items:start}.jp-auth-brand{margin-top:5px}.jp-auth-card{padding:20px}}
  `;
  document.head.appendChild(style);
}
function gate() {
  injectStyles();
  if (document.getElementById("jpAuthGate")) return;
  document.body.classList.add("jp-auth-pending");
  const gate = document.createElement("section");
  gate.id = "jpAuthGate";
  gate.setAttribute("aria-label","Job Pro account access");
  gate.innerHTML = `
    <div class="jp-auth-wrap">
      <div class="jp-auth-brand"><div class="jp-auth-logo">J</div><div><b>JOB_PRO</b><small>LEARN · PRACTISE · GROW</small></div></div>
      <div class="jp-auth-card">
        <div class="jp-auth-eyebrow" id="jpAuthEyebrow"></div>
        <h1 id="jpAuthTitle"></h1><p class="jp-auth-desc" id="jpAuthDesc"></p>
        <form id="jpAuthForm" novalidate>
          <label class="jp-auth-field" id="jpNameWrap"><span id="jpNameLabel"></span><input id="jpAuthName" type="text" autocomplete="name" maxlength="70"></label>
          <label class="jp-auth-field"><span id="jpEmailLabel"></span><input id="jpAuthEmail" type="email" autocomplete="email" required></label>
          <label class="jp-auth-field"><span id="jpPasswordLabel"></span><input id="jpAuthPassword" type="password" autocomplete="current-password" minlength="6" required></label>
          <button class="jp-auth-primary" id="jpAuthSubmit" type="submit"></button>
        </form>
        <button class="jp-auth-switch" id="jpAuthSwitch" type="button"></button>
        <div id="jpAuthStatus" role="status" aria-live="polite"></div>
        <div class="jp-auth-note" id="jpAuthTagline"></div>
      </div>
    </div>`;
  document.body.appendChild(gate);
  document.getElementById("jpAuthForm").addEventListener("submit", submitAuth);
  document.getElementById("jpAuthSwitch").addEventListener("click", () => {
    authMode = authMode === "login" ? "register" : "login";
    renderGate();
  });
  renderGate();
}
function renderGate() {
  const t = copy();
  const isRegister = authMode === "register";
  document.getElementById("jpAuthEyebrow").textContent = t.eyebrow;
  document.getElementById("jpAuthTitle").textContent = isRegister ? t.register : t.title;
  document.getElementById("jpAuthDesc").textContent = t.desc;
  document.getElementById("jpNameLabel").textContent = t.name;
  document.getElementById("jpEmailLabel").textContent = t.email;
  document.getElementById("jpPasswordLabel").textContent = t.password;
  document.getElementById("jpNameWrap").hidden = !isRegister;
  document.getElementById("jpAuthName").required = isRegister;
  document.getElementById("jpAuthPassword").autocomplete = isRegister ? "new-password" : "current-password";
  document.getElementById("jpAuthSubmit").textContent = isRegister ? t.register : t.login;
  document.getElementById("jpAuthSwitch").textContent = isRegister ? t.switchLogin : t.switchRegister;
  document.getElementById("jpAuthTagline").textContent = t.tagline;
}
function status(message, error=false) {
  const el = document.getElementById("jpAuthStatus");
  if (el) { el.textContent = message || ""; el.style.color = error ? "#ffb7c1" : "#9ce9d7"; }
}
function authMessage(error) {
  const t = copy();
  return (t.errors[error?.code] || error?.message || "Authentication failed.") + (error?.code ? " ["+error.code+"]" : "");
}
async function submitAuth(event) {
  event.preventDefault();
  if (!auth) { status(copy().config,true); return; }
  const email = document.getElementById("jpAuthEmail").value.trim();
  const password = document.getElementById("jpAuthPassword").value;
  const name = document.getElementById("jpAuthName").value.trim();
  if (!email || !document.getElementById("jpAuthEmail").checkValidity()) { status(copy().errors["auth/invalid-email"],true); return; }
  if (password.length < 6) { status(copy().errors["auth/weak-password"],true); return; }
  if (authMode === "register" && !name) { status(words() ? "তোমার নাম লিখো।" : "Please enter your name.",true); return; }
  const button = document.getElementById("jpAuthSubmit");
  button.disabled = true; status(copy().loading);
  try {
    if (authMode === "register") {
      const credential = await createUserWithEmailAndPassword(auth,email,password);
      await updateProfile(credential.user,{displayName:name});
    } else {
      await signInWithEmailAndPassword(auth,email,password);
    }
  } catch (error) {
    status(authMessage(error),true);
  } finally {
    button.disabled = false;
  }
}
function showApp(user) {
  const gateEl = document.getElementById("jpAuthGate");
  document.body.classList.remove("jp-auth-pending");
  document.body.classList.toggle("jp-auth-locked",!user);
  if (gateEl) gateEl.hidden = !!user;
  if (user) {
    const title = document.querySelector("#profile .course h3");
    const detail = document.querySelector("#profile .course p");
    if (title) title.textContent = user.displayName || user.email || "Learner";
    if (detail) detail.textContent = user.email || "";
  }
}
function injectProfileAccount() {
  const profile = document.getElementById("profile");
  if (!profile || document.getElementById("jpAccountCard")) return;
  const card = document.createElement("div");
  card.className = "card"; card.id = "jpAccountCard"; card.style.marginTop = "14px";
  card.innerHTML = '<h3 style="margin-top:0">Account</h3><p class="muted" id="jpAccountEmail"></p><button class="secondary" id="jpSignOut" type="button">Sign out</button>';
  profile.appendChild(card);
  document.getElementById("jpSignOut").addEventListener("click",async()=>{if(auth) await signOut(auth);});
}
async function syncToCloud() {
  if (!currentUser || !db || busy || !navigator.onLine) return;
  busy = true;
  try {
    const ref = doc(db,"users",currentUser.uid,"private","learningData");
    await setDoc(ref,{...snapshot(),ownerUid:currentUser.uid,updatedAt:serverTimestamp()});
  } catch(error) { console.error("Firebase sync error",error); }
  finally { busy = false; }
}
async function restoreCloudData(user) {
  try {
    const ref = doc(db,"users",user.uid,"private","learningData");
    const result = await getDoc(ref);
    if (result.exists()) {
      const data = result.data();
      if (data.progress) localStorage.setItem("nv_progress",JSON.stringify(data.progress));
      if (data.tasks) localStorage.setItem("nv_tasks",JSON.stringify(data.tasks));
      if (data.bookmarks) localStorage.setItem("nv_bookmarks",JSON.stringify(data.bookmarks));
      window.dispatchEvent(new CustomEvent("nv:cloud-restored"));
    } else await syncToCloud();
  } catch(error) { console.error("Firebase restore error",error); }
}
function scheduleSync() {
  if (!currentUser) return;
  clearTimeout(syncTimer); syncTimer = setTimeout(syncToCloud,900);
}
async function start() {
  gate();
  injectProfileAccount();
  if (!firebaseConfigured) { authReady=true; showApp(null); status(copy().config,true); return; }
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    await setPersistence(auth,browserLocalPersistence);
    try {
      db = initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
    } catch { db = getFirestore(app); }
    onAuthStateChanged(auth,async user=>{
      currentUser=user; authReady=true;
      showApp(user);
      const emailEl=document.getElementById("jpAccountEmail");
      if(emailEl) emailEl.textContent=user ? (user.displayName ? user.displayName+" · " : "")+user.email : "";
      if(user) await restoreCloudData(user);
    });
    window.addEventListener("nv:data",scheduleSync);
    window.addEventListener("online",syncToCloud);
    window.addEventListener("nv:cloud-restored",()=>{
      if(typeof window.renderStats==="function") window.renderStats();
      if(typeof window.renderTasks==="function") window.renderTasks();
    });
  } catch(error) {
    console.error("Firebase initialization failed",error);
    authReady=true; showApp(null); status(authMessage(error),true);
  }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start);
else start();
