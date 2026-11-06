const admin = require("firebase-admin");

async function main() {
  const uid = process.argv[2];
  if (!uid || uid.length < 10) {
    console.error("Usage: node scripts/set-question-admin.js FIREBASE_AUTH_UID");
    process.exit(1);
  }
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const user = await admin.auth().getUser(uid);
  if (!user.email || !user.emailVerified) {
    throw new Error("The target account must have a verified email address.");
  }
  await admin.auth().setCustomUserClaims(uid, { ...(user.customClaims || {}), admin: true });
  console.log("Question admin claim granted to:", user.email);
  console.log("The user must sign out and sign in again to refresh the ID token.");
}
main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
