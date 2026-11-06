import { mkdir, copyFile } from "node:fs/promises";
await mkdir("www", { recursive: true });
for (const file of ["index.html", "manifest.webmanifest", "sw.js", "firebase-config.js", "firebase.js", "ai-assistant.js", "question-bank.js"]) {
  await copyFile(file, "www/" + file);
}
console.log("Prepared Capacitor web assets.");
