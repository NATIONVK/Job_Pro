// Firebase Web App configuration.
// These values identify your Firebase project; they are not admin credentials.
// Replace every placeholder with values from Firebase Console > Project settings > Your apps.
export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};

export const firebaseConfigured = Object.values(firebaseConfig).every(
  value => typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("YOUR_")
);
