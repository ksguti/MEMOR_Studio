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

const form = document.getElementById("affForm");
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Debes iniciar sesión para enviar la solicitud");
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  try {
    console.log("📨 Enviando solicitud afiliado/colaborador...");

    await addDoc(collection(db, "affiliations"), {
      userId: currentUser.uid,

      type: document.getElementById("type").value,
      discordUser: document.getElementById("discordUser").value.trim(),
      minecraftUser: document.getElementById("minecraftUser").value.trim(),
      email: document.getElementById("email").value.trim(),
      experience: document.getElementById("experience").value.trim(),
      motivation: document.getElementById("motivation").value.trim(),

      status: "pending",
      createdAt: serverTimestamp(),
    });

    alert("✅ Solicitud enviada correctamente");
    form.reset();
  } catch (error) {
    console.error("❌ ERROR:", error);
    alert("Error al enviar la solicitud");
  }
});
