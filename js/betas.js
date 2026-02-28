import { app } from "./firebase.js";

import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);
const form = document.getElementById("betaForm");

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Debes iniciar sesión para enviar la inscripción");
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) return;

  try {
    console.log("📨 Enviando inscripción beta...");

    await addDoc(collection(db, "betas"), {
      userId: currentUser.uid,

      discordId: document.getElementById("discordId").value.trim(),
      discordUser: document.getElementById("discordUser").value.trim(),
      minecraftUser: document.getElementById("minecraftUser").value.trim(),
      country: document.getElementById("country").value.trim(),
      email: document.getElementById("email").value.trim(),
      source: document.getElementById("source").value.trim(),

      isPremium: document.getElementById("premiumCheck").checked,

      status: "pending",
      createdAt: serverTimestamp(),
    });

    alert("✅ Inscripción enviada correctamente");
    form.reset();
  } catch (error) {
    console.error("❌ ERROR:", error);
    alert("Error al enviar la inscripción");
  }
});
