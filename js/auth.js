import { app, auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const btnLogin = document.getElementById("btnLogin");
const btnRegister = document.getElementById("btnRegister");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const regNombre = document.getElementById("regNombre");
const regFecha = document.getElementById("regFecha");
const regEmail = document.getElementById("regEmail");
const regMinecraft = document.getElementById("regMinecraft");
const regPassword = document.getElementById("regPassword");
const regPassword2 = document.getElementById("regPassword2");
const regPremium = document.getElementById("regPremium");

function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
}

btnLogin.onclick = () => {
  btnLogin.classList.add("active");
  btnRegister.classList.remove("active");
  loginForm.classList.add("active");
  registerForm.classList.remove("active");
};

btnRegister.onclick = () => {
  btnRegister.classList.add("active");
  btnLogin.classList.remove("active");
  registerForm.classList.add("active");
  loginForm.classList.remove("active");
};

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await waitForAuthUser();
    const current = auth.currentUser;

    if (current?.isAnonymous) {
      await signOut(auth);
    }

    await signInWithEmailAndPassword(
      auth,
      loginEmail.value.trim(),
      loginPassword.value,
    );

    window.location.href = "perfil.html";
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    alert("Correo o contraseña incorrectos");
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (regPassword.value !== regPassword2.value) {
    alert("Las contraseñas no coinciden");
    return;
  }

  const fullName = regNombre.value.trim();
  const birthDate = regFecha.value;
  const email = regEmail.value.trim().toLowerCase();
  const minecraft = regMinecraft.value.trim();
  const pass = regPassword.value;
  const isPremium = !!regPremium.checked;

  try {
    await waitForAuthUser();

    let user = auth.currentUser;

    if (user && user.isAnonymous) {
      console.log(
        "🧩 Hay anónimo. Convirtiendo a cuenta real... UID:",
        user.uid,
      );

      const credential = EmailAuthProvider.credential(email, pass);

      try {
        const linked = await linkWithCredential(user, credential);
        user = linked.user;
        console.log("✅ Anónimo convertido. UID se mantiene:", user.uid);
      } catch (err) {
        if (err?.code === "auth/email-already-in-use") {
          alert("Ese correo ya está registrado. Inicia sesión.");
          return;
        }
        console.error("❌ LINK ERROR:", err);
        throw err;
      }
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      user = cred.user;
      console.log("✅ Usuario creado normal:", user.uid);
    }

    const userRef = doc(db, "users", user.uid);
    const existing = await getDoc(userRef);

    if (!existing.exists()) {
      await setDoc(userRef, {
        fullName,
        birthDate,
        email,
        minecraft,
        isPremium,
        role: "user",
        warns: 0,
        badges: [],
        banner: "default.png",
        points: 0,
        createdAt: serverTimestamp(),
      });
      console.log("✅ Perfil creado en Firestore:", user.uid);
    }

    window.location.href = "perfil.html";
  } catch (error) {
    console.error("❌ REGISTRO ERROR:", error);
    alert("Error al crear la cuenta: " + (error?.message || error));
  }
});
