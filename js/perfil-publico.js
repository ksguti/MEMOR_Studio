import { app, auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  doc,
  getDoc,
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const BADGE_QUALITY_MAP = {
  comun: { class: "badge-verde", label: "Insignia Común" },
  epico: { class: "badge-morado", label: "Insignia Épica" },
  mitico: { class: "badge-rojo", label: "Insignia Mítica" },
  legendario: { class: "badge-amarillo", label: "Insignia Legendaria" },
};

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
}

const params = new URLSearchParams(window.location.search);
const uid = params.get("uid");

if (!uid) {
  alert("Perfil inválido (falta uid)");
  throw new Error("UID faltante en querystring");
}

const goRankingBtn = document.getElementById("goRankingBtn");
if (goRankingBtn) goRankingBtn.onclick = () => (location.href = "ranking.html");

const backBtn = document.getElementById("backBtn");
if (backBtn) backBtn.onclick = () => history.back();

let currentUser = await waitForAuthUser();

if (!currentUser) {
  try {
    await signInAnonymously(auth);
    currentUser = await waitForAuthUser();
    console.log("✅ Anónimo creado en auth principal:", currentUser?.uid);
  } catch (e) {
    console.error(e);
    alert(
      "No se pudo iniciar sesión anónima. Verifica Anonymous Auth en Firebase.",
    );
    throw e;
  }
} else {
  console.log(
    "ℹ️ Ya existe sesión:",
    currentUser.uid,
    "Anon:",
    currentUser.isAnonymous,
  );
}

const snap = await getDoc(doc(db, "users", uid));
if (!snap.exists()) {
  alert("Usuario no encontrado");
  throw new Error("Usuario no existe");
}
const data = snap.data();

const fullNameEl = document.getElementById("fullName");
if (fullNameEl) fullNameEl.textContent = data.fullName || "Usuario";

const mcNameEl = document.getElementById("minecraftName");
if (mcNameEl) mcNameEl.textContent = data.minecraft || "-";

const birthEl = document.getElementById("birthDate");
if (birthEl) birthEl.textContent = data.birthDate || "-";

const roleEl = document.getElementById("userRole");
if (roleEl) roleEl.textContent = data.role || "user";

const warnsEl = document.getElementById("warns");
if (warnsEl) warnsEl.textContent = String(data.warns ?? 0);

const pointsEl = document.getElementById("points");
if (pointsEl) pointsEl.textContent = `${data.points ?? 0} puntos`;

const bannerEl = document.getElementById("banner");
if (bannerEl) bannerEl.src = `img/banners/${data.banner || "default.png"}`;

const mcBtn = document.getElementById("mcNameBtn");
if (mcBtn) {
  mcBtn.onclick = async () => {
    await navigator.clipboard.writeText(data.minecraft || "");
    alert("Nombre de Minecraft copiado");
  };
}

const skin = document.getElementById("skin");
const premium = document.getElementById("premiumBadge");
const downloadBtn = document.getElementById("downloadSkinBtn");

if (data.isPremium) {
  if (skin) skin.src = `https://mc-heads.net/avatar/${data.minecraft}/128`;
  if (premium) {
    premium.src = "icon/premium.png";
    premium.style.display = "block";
  }
  if (downloadBtn) {
    downloadBtn.style.display = "inline-block";
    downloadBtn.onclick = () =>
      window.open(`https://mc-heads.net/download/${data.minecraft}`, "_blank");
  }
} else {
  if (skin) skin.src = "img/skins/default.jpg";
  if (premium) premium.style.display = "none";
  if (downloadBtn) downloadBtn.style.display = "none";
}

const discordText = document.getElementById("discord-text");
if (discordText) {
  if (data.discord?.inServer === true) {
    discordText.textContent = "✅ En el servidor oficial";
    discordText.style.color = "#43b581";
  } else {
    discordText.textContent = "❌ No está en el servidor";
    discordText.style.color = "#f04747";
  }
}

const badgesBox = document.querySelector(".badges");
if (badgesBox) {
  badgesBox.innerHTML = "";

  const badgesSnap = await getDocs(collection(db, "badges"));
  badgesSnap.forEach((docu) => {
    if (!data.badges?.includes(docu.id)) return;

    const b = docu.data();
    const qKey = (b.quality || "comun").toLowerCase();
    const quality = BADGE_QUALITY_MAP[qKey] || BADGE_QUALITY_MAP.comun;

    const card = document.createElement("div");
    card.className = "badge-card";

    card.innerHTML = `
      <img src="img/insignias/${escapeHtml(b.image)}" alt="${escapeHtml(b.name)}">
      <div class="info-panel">
        <h3>${escapeHtml(b.name)}</h3>
        <p>${escapeHtml(b.description || "Insignia especial de MEMOR Studio")}</p>
        <span class="${quality.class}">${quality.label}</span>
      </div>
    `;

    badgesBox.appendChild(card);
  });
}
