import { app } from "./firebase.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// solo se puede acceder al modo super sudo para poder cambiar de rol de usuario a admin o moderador por el momento
const SUPER_SUDO = {
  uid: "SUPER_ADMIN_UID",
  email: "SUPER_ADMIN_EMAIL",
  discordId: "SUPER_ADMIN_DISCORD_ID",
};

const auth = getAuth(app);
const db = getFirestore(app);

const toAdmin = document.getElementById("toAdmin");
const toProfile = document.getElementById("toProfile");
const logout = document.getElementById("logout");

const toggleRoleBox = document.getElementById("toggleRoleBox");
const roleBox = document.getElementById("roleBox");
const roleSearch = document.getElementById("roleSearch");
const results = document.getElementById("results");

const bigProfile = document.getElementById("bigProfile");
const bigBanner = document.getElementById("bigBanner");
const bigSkin = document.getElementById("bigSkin");

const bigName = document.getElementById("bigName");
const bigUid = document.getElementById("bigUid");
const bigEmail = document.getElementById("bigEmail");
const bigMinecraft = document.getElementById("bigMinecraft");
const bigDiscord = document.getElementById("bigDiscord");
const bigRole = document.getElementById("bigRole");
const bigPremium = document.getElementById("bigPremium");

const roleSelect = document.getElementById("roleSelect");
const saveRole = document.getElementById("saveRole");
const saveHint = document.getElementById("saveHint");

let allUsers = [];
let selectedUid = null;
let selectedData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const authEmail = (user.email || "").toLowerCase();
  const mustEmail = SUPER_SUDO.email.toLowerCase();

  if (user.uid !== SUPER_SUDO.uid || authEmail !== mustEmail) {
    alert("No autorizado (UID o correo no coinciden)");
    await signOut(auth);
    location.href = "login.html"; 
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    alert("No autorizado (perfil no encontrado)");
    await signOut(auth);
    location.href = "login.html";
    return;
  }

  const myData = snap.data();
  const myDiscordId = myData?.discord?.id ? String(myData.discord.id) : "";

  if (String(SUPER_SUDO.discordId) !== myDiscordId) {
    alert("No autorizado (Discord ID no coincide)");
    await signOut(auth);
    location.href = "login.html";
    return;
  }

  await loadAllUsers();
});

async function loadAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  allUsers = [];
  snap.forEach((d) => allUsers.push({ uid: d.id, data: d.data() }));

  results.innerHTML = `<div class="hint">Escribe para buscar usuarios...</div>`;
}

toggleRoleBox.onclick = () => {
  roleBox.classList.toggle("open");
};

roleSearch.oninput = () => {
  const q = roleSearch.value.trim().toLowerCase();
  if (!q) {
    results.innerHTML = `<div class="hint">Escribe para buscar usuarios...</div>`;
    return;
  }

  const matches = allUsers.filter((u) => {
    const data = u.data || {};
    const fullName = String(data.fullName || "").toLowerCase();
    const mc = String(data.minecraft || "").toLowerCase();
    const email = String(data.email || "").toLowerCase();
    const discordId = String(data?.discord?.id || "").toLowerCase();
    const discordUser = String(data?.discord?.username || "").toLowerCase();

    return (
      u.uid.toLowerCase().includes(q) ||
      discordId.includes(q) ||
      fullName.includes(q) ||
      mc.includes(q) ||
      email.includes(q) ||
      discordUser.includes(q)
    );
  });

  if (matches.length === 0) {
    results.innerHTML = `<div class="hint">Sin resultados para: <b>${escapeHtml(q)}</b></div>`;
    return;
  }

  results.innerHTML = "";
  matches
    .slice(0, 40)
    .forEach((u) => results.appendChild(renderResultItem(u.uid, u.data)));
};

function renderResultItem(uid, data) {
  const row = document.createElement("div");
  row.className = "result-item";

  const isPremium = !!data.isPremium;
  const mc = data.minecraft || "Sin Minecraft";
  const full = data.fullName || "Sin nombre";
  const role = data.role || "user";

  const discordLabel = data?.discord?.username
    ? `${data.discord.username} (${data.discord.id || "sin id"})`
    : "No vinculado";

  const avatar = isPremium
    ? `https://mc-heads.net/avatar/${mc}/128`
    : "img/skins/default.jpg";

  row.innerHTML = `
    <img src="${avatar}" alt="avatar">
    <div class="meta">
      <div><b>${escapeHtml(full)}</b> <small style="color:#9ca3af;">(${escapeHtml(mc)})</small></div>
      <small>UID: ${escapeHtml(uid)} | Rol: <b>${escapeHtml(role)}</b></small>
      <small>Email: ${escapeHtml(data.email || "-")}</small>
      <small>Discord: ${escapeHtml(discordLabel)}</small>
    </div>
  `;

  row.onclick = () => selectUser(uid, data);
  return row;
}

function selectUser(uid, data) {
  selectedUid = uid;
  selectedData = data;

  const bannerFile = data.banner || "default.png";
  bigBanner.src = `img/banners/${bannerFile}`;

  const mc = data.minecraft || "Steve";
  const avatar = data.isPremium
    ? `https://mc-heads.net/avatar/${mc}/256`
    : "img/skins/default.jpg";
  bigSkin.src = avatar;

  bigName.textContent = data.fullName || "(Sin nombre)";
  bigUid.textContent = uid;

  bigEmail.textContent = data.email || "-";

  bigMinecraft.textContent = data.minecraft || "-";

  const discordText = data?.discord?.username
    ? `${data.discord.username} — ID: ${data.discord.id || "?"}`
    : "No vinculado";
  bigDiscord.textContent = discordText;

  bigRole.textContent = data.role || "user";
  bigPremium.textContent = data.isPremium ? "Sí" : "No";

  roleSelect.value = data.role || "user";
  saveHint.textContent = "Selecciona un rol y presiona “Guardar rol”.";

  bigProfile.classList.add("show");
}

saveRole.onclick = async () => {
  if (!selectedUid) {
    alert("Selecciona un usuario primero");
    return;
  }

  const newRole = roleSelect.value;

  if (!["user", "moderator", "admin"].includes(newRole)) {
    alert("Rol inválido");
    return;
  }

  saveRole.disabled = true;
  saveHint.textContent = "Guardando...";

  try {
    await updateDoc(doc(db, "users", selectedUid), { role: newRole });

    selectedData.role = newRole;
    bigRole.textContent = newRole;
    saveHint.textContent = `✅ Rol actualizado a "${newRole}"`;

    const idx = allUsers.findIndex((u) => u.uid === selectedUid);
    if (idx !== -1) allUsers[idx].data.role = newRole;
  } catch (e) {
    console.error(e);
    alert("Error actualizando rol");
    saveHint.textContent = "❌ Error actualizando rol";
  } finally {
    saveRole.disabled = false;
  }
};

toAdmin.onclick = () => (location.href = "admin.html");
toProfile.onclick = () => (location.href = "perfil.html");
logout.onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}