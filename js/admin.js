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

const BADGE_POINTS = {
  comun: 5,
  epico: 10,
  mitico: 15,
  legendario: 20,
};

const auth = getAuth(app);
const db = getFirestore(app);

const list = document.getElementById("list");
const searchInput = document.getElementById("searchInput");
const searchHint = document.getElementById("searchHint");

const toProfile = document.getElementById("toProfile");
const toModerator = document.getElementById("toModerator");
const logout = document.getElementById("logout");

let dirty = false;
let currentOpen = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists() || snap.data().role !== "admin") {
    alert("No autorizado");
    await signOut(auth);
    location.href = "login.html";
    return;
  }

  loadUsers();
});

async function loadUsers() {
  list.innerHTML = "";

  const usersSnap = await getDocs(collection(db, "users"));
  const badgesSnap = await getDocs(collection(db, "badges"));

  const badges = [];
  badgesSnap.forEach((b) => badges.push({ id: b.id, ...b.data() }));

  usersSnap.forEach((u) => renderUser(u.id, u.data(), badges));

  if (searchHint) {
    searchHint.textContent = "Cargado. Usa el buscador para filtrar…";
  }
}

function calculateBadgePoints(userBadgeIds, allBadges) {
  let total = 0;

  (userBadgeIds || []).forEach((id) => {
    const badge = allBadges.find((b) => b.id === id);
    if (!badge) return;
    total += BADGE_POINTS[badge.quality] || 0;
  });

  return total;
}

function renderUser(uid, data, badges) {
  const card = document.createElement("div");
  card.className = "user-card";
  card.dataset.uid = uid;

  const header = document.createElement("div");
  header.className = "user-header";

  const left = document.createElement("div");
  left.innerHTML = `${escapeHtml(data.fullName || "Sin nombre")} <small>(${escapeHtml(data.minecraft || "-")})</small>`;

  const right = document.createElement("small");
  right.textContent = `Puntos: ${data.points ?? 0} | Warns: ${data.warns ?? 0}`;

  header.append(left, right);

  const body = document.createElement("div");
  body.className = "user-body";

  const avatar = data.isPremium
    ? `https://mc-heads.net/avatar/${data.minecraft}/128`
    : "img/skins/default.jpg";

  body.innerHTML = `
    <div class="preview">
      <img class="banner" src="img/banners/${escapeHtml(data.banner || "default.png")}">
      <img src="${avatar}">
    </div>

    <label>Nombre</label>
    <input value="${escapeAttr(data.fullName || "")}" data-field="fullName">

    <label>Minecraft</label>
    <input value="${escapeAttr(data.minecraft || "")}" data-field="minecraft">

    <label>Banner</label>
    <input value="${escapeAttr(data.banner || "")}" data-field="banner">

    <label>Fecha nacimiento</label>
    <input type="date" value="${escapeAttr(data.birthDate || "")}" data-field="birthDate">

    <label>Warns</label>
    <input type="number" value="${Number(data.warns ?? 0)}" data-field="warns">

    <label>Premium</label>
    <div class="toggle">
      <button type="button" class="yes ${data.isPremium ? "active" : ""}">SI</button>
      <button type="button" class="no ${!data.isPremium ? "active" : ""}">NO</button>
    </div>

    <label>Puntos</label>
    <input type="number" value="${Number(data.points ?? 0)}" data-field="points">
    <button type="button" class="btn primary addPoints">+10</button>

    <h3>Insignias</h3>
    <div class="badges">
      ${badges
        .map(
          (b) => `
        <label class="badge-item">
          <input type="checkbox" value="${escapeAttr(b.id)}"
            ${(data.badges || []).includes(b.id) ? "checked" : ""}>

          <img 
            src="img/insignias/${escapeAttr(b.image)}" 
            alt="${escapeAttr(b.name)}" 
            class="badge-preview">

          <span>
            ${escapeHtml(b.name)}
            <small>(${escapeHtml(b.quality || "comun")})</small>
          </span>
        </label>
      `,
        )
        .join("")}
    </div>

    ${
      data.discord
        ? `
      <p style="margin-top:14px;color:#cbd5e1;">
        Discord: ${escapeHtml(data.discord.username || "-")}<br>
        Estado: ${data.discord.inServer ? "🟢 En servidor" : "🔴 Fuera"}
      </p>
    `
        : "<p style='margin-top:14px;color:#cbd5e1;'>Discord no vinculado</p>"
    }

    <div class="actions">
      <button type="button" class="btn primary save">Guardar</button>
      <button type="button" class="btn secondary copy">Copiar UID</button>

      <button 
        type="button"
        class="btn secondary download-skin-admin"
        style="display:${data.isPremium ? "inline-block" : "none"}">
        Descargar Skin
      </button>
    </div>
  `;

  header.onclick = () => {
    if (dirty && currentOpen !== body) {
      if (!confirm("Tienes cambios sin guardar ¿Salir?")) return;
      dirty = false;
    }

    document
      .querySelectorAll(".user-body")
      .forEach((b) => b.classList.remove("open"));
    body.classList.toggle("open");
    currentOpen = body;
  };

  body.oninput = () => (dirty = true);

  body.querySelector(".copy").onclick = () =>
    navigator.clipboard.writeText(uid);

  const downloadSkinBtn = body.querySelector(".download-skin-admin");
  if (downloadSkinBtn && data.isPremium) {
    downloadSkinBtn.onclick = () => {
      window.open(`https://mc-heads.net/download/${data.minecraft}`, "_blank");
    };
  }

  const yes = body.querySelector(".yes");
  const no = body.querySelector(".no");

  yes.onclick = () => {
    yes.classList.add("active");
    no.classList.remove("active");
    dirty = true;
  };
  no.onclick = () => {
    no.classList.add("active");
    yes.classList.remove("active");
    dirty = true;
  };

  body.querySelector(".save").onclick = async () => {
    const updated = {};

    body.querySelectorAll("[data-field]").forEach((i) => {
      updated[i.dataset.field] =
        i.type === "number" ? Number(i.value) : i.value;
    });

    updated.isPremium = yes.classList.contains("active");
    updated.badges = [
      ...body.querySelectorAll("input[type=checkbox]:checked"),
    ].map((c) => c.value);

    const badgePoints = calculateBadgePoints(updated.badges, badges);
    updated.points = badgePoints;

    await updateDoc(doc(db, "users", uid), updated);
    dirty = false;
    alert("Perfil actualizado");
    loadUsers();
  };

  body.querySelector(".addPoints").onclick = async () => {
    await updateDoc(doc(db, "users", uid), {
      points: (data.points || 0) + 10,
    });
    loadUsers();
  };

  card.append(header, body);
  list.appendChild(card);
}

searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();

  let visible = 0;
  document.querySelectorAll(".user-card").forEach((card) => {
    const hay =
      card.innerText.toLowerCase().includes(q) ||
      (card.dataset.uid || "").toLowerCase().includes(q);
    card.style.display = hay ? "" : "none";
    if (hay) visible++;
  });

  if (searchHint) {
    searchHint.textContent = q
      ? `Mostrando ${visible} resultado(s) para: "${q}"`
      : "Escribe para filtrar la lista…";
  }
};

toProfile.onclick = () => (location.href = "perfil.html");
toModerator.onclick = () => (location.href = "moderador.html");
logout.onclick = async () => {
  await signOut(auth);
  location.href = "login.html";
};

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}
