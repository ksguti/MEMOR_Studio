import { app } from "./firebase.js";

import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

const list = document.getElementById("rankingList");
const btnTop = document.getElementById("btnTop");
const btnGlobal = document.getElementById("btnGlobal");
const searchInput = document.getElementById("searchInput");

const pagination = document.getElementById("pagination");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

const loginGate = document.getElementById("loginGate");
const goLoginBtn = document.getElementById("goLoginBtn");

const modal = document.getElementById("rankingModal");
const closeModal = document.getElementById("closeModal");
const modalBanner = document.getElementById("modalBanner");
const modalSkin = document.getElementById("modalSkin");
const modalMinecraft = document.getElementById("modalMinecraft");
const modalFullName = document.getElementById("modalFullName");
const modalRole = document.getElementById("modalRole");
const modalBirth = document.getElementById("modalBirth");
const modalPoints = document.getElementById("modalPoints");
const modalPremium = document.getElementById("modalPremium");
const copyIdBtn = document.getElementById("copyIdBtn");
const rankingPos = document.getElementById("rankingPos");

let allUsers = [];
let filteredUsers = [];
let badgesMap = {};

let rankMap = new Map();
let isGlobal = false;
let currentPage = 1;
const PAGE_SIZE = 5;

const BADGE_POINTS = {
  comun: 5,
  epico: 10,
  mitico: 15,
  legendario: 20,
};

const BADGE_QUALITY_MAP = {
  comun: { class: "badge-verde", label: "Insignia Común" },
  epico: { class: "badge-morado", label: "Insignia Épica" },
  mitico: { class: "badge-rojo", label: "Insignia Mítica" },
  legendario: { class: "badge-amarillo", label: "Insignia Legendaria" },
};

function showLoginGate() {
  if (loginGate) loginGate.classList.remove("hidden");
  if (pagination) pagination.classList.add("hidden");
  if (list) list.innerHTML = "";
}

function hideLoginGate() {
  if (loginGate) loginGate.classList.add("hidden");
}

if (goLoginBtn) {
  goLoginBtn.onclick = () => (location.href = "login.html");
}

async function loadBadges() {
  const snap = await getDocs(collection(db, "badges"));
  badgesMap = {};
  snap.forEach((d) => (badgesMap[d.id] = d.data()));
}

function calcScore(u) {
  let extra = 0;
  (u.badges || []).forEach((id) => {
    const b = badgesMap[id];
    if (!b) return;
    extra += BADGE_POINTS[(b.quality || "comun").toLowerCase()] || 0;
  });
  return (u.points || 0) + extra;
}

async function loadRanking() {
  const snap = await getDocs(collection(db, "users"));
  const tmp = [];

  snap.forEach((d) => {
    const u = { id: d.id, ...d.data() };
    u.score = calcScore(u);
    tmp.push(u);
  });

  tmp.sort((a, b) => b.score - a.score);

  allUsers = tmp;

  rankMap = new Map();
  allUsers.forEach((u, idx) => rankMap.set(u.id, idx + 1));

  applyFilterAndRender();
}

function applyFilterAndRender() {
  const q = (searchInput?.value || "").trim().toLowerCase();

  let base = allUsers;

  if (q) {
    base = allUsers.filter((u) => {
      const mc = String(u.minecraft || "").toLowerCase();
      const fn = String(u.fullName || "").toLowerCase();
      const id = String(u.id || "").toLowerCase();
      return mc.includes(q) || fn.includes(q) || id.includes(q);
    });
  }

  if (!isGlobal) {
    filteredUsers = q ? base : base.slice(0, 5);
  } else {
    filteredUsers = [...base].sort((a, b) => {
      const amc = String(a.minecraft || "").toLowerCase();
      const bmc = String(b.minecraft || "").toLowerCase();
      return amc.localeCompare(bmc);
    });
  }

  currentPage = 1;
  render();
}

function getPageUsers() {
  const start = (currentPage - 1) * PAGE_SIZE;
  return filteredUsers.slice(start, start + PAGE_SIZE);
}

function updatePagination() {
  if (!pagination || !pageInfo || !prevPageBtn || !nextPageBtn) return;

  // Solo en GLOBAL
  if (!isGlobal) {
    pagination.classList.add("hidden");
    pagination.style.display = "none";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  pagination.classList.remove("hidden");
  pagination.style.display = "flex";

  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages || totalPages === 1;
}

function render() {
  if (!list) return;
  list.innerHTML = "";

  const users = isGlobal ? getPageUsers() : filteredUsers;

  users.forEach((u) => {
    const realRank = rankMap.get(u.id) || 999999;

    const medal =
      realRank === 1
        ? "🥇"
        : realRank === 2
          ? "🥈"
          : realRank === 3
            ? "🥉"
            : "";

    const avatar = u.isPremium
      ? `https://mc-heads.net/head/${encodeURIComponent(u.minecraft)}/96`
      : "img/skins/defaultskinranking.png";

    const premiumHTML = u.isPremium
      ? `<span class="badge-verde">Premium</span>`
      : `<span class="badge-rojo">No Premium</span>`;

    const card = document.createElement("div");
    card.className = `ranking-card`;

    card.innerHTML = `
      <div class="rank-num">${medal || `#${realRank}`}</div>

      <img class="avatar" src="${avatar}" alt="">

      <div class="rank-info">
        <strong>${escapeHtml(u.minecraft || "-")}</strong><br>
        ${premiumHTML}
        <small>${escapeHtml(u.fullName || "")}</small>
        <div>🏆 ${u.points || 0} pts • ⭐ ${u.score || 0}</div>
      </div>

      <div class="badges">
        ${Array.from({ length: 5 })
          .map((_, idx) => {
            const badgeId = (u.badges || [])[idx];
            if (!badgeId || !badgesMap[badgeId]) {
              return `<div class="badge-slot"></div>`;
            }

            const b = badgesMap[badgeId];
            const qualityKey = (b.quality || "comun").toLowerCase();
            const q = BADGE_QUALITY_MAP[qualityKey] || BADGE_QUALITY_MAP.comun;
            const pts = BADGE_POINTS[qualityKey] || 0;

            return `
            <div class="badge-card" onclick="event.stopPropagation()">
              <img src="img/insignias/${escapeHtml(b.image)}" alt="">
              <div class="info-panel">
                <h3>${escapeHtml(b.name)}</h3>
                <p>${escapeHtml(b.description || "")}</p>
                <span class="${q.class}">
                  ${q.label} • ${pts} pts
                </span>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;

    card.onclick = () => openModal(u);
    list.appendChild(card);
  });

  updatePagination();
}

function openModal(u) {
  if (!modal) return;
  modal.classList.remove("hidden");

  modalBanner.src = `img/banners/${u.banner || "default.png"}`;
  modalSkin.src = u.isPremium
    ? `https://mc-heads.net/avatar/${encodeURIComponent(u.minecraft)}/128`
    : "img/skins/default.jpg";

  modalMinecraft.textContent = u.minecraft || "";
  modalFullName.textContent = u.fullName || "";

  modalRole.textContent = `Rol: ${u.role || "-"}`;
  modalBirth.textContent = `Cumpleaños: ${u.birthDate || "-"}`;
  modalPoints.textContent = `🏆 ${u.points || 0} pts`;

  const realRank = rankMap.get(u.id) || 0;
  rankingPos.textContent = realRank ? `Ranking real: #${realRank}` : "";

  modalPremium.innerHTML = u.isPremium
    ? `<span class="badge-verde">Premium</span>`
    : `<span class="badge-rojo">No Premium</span>`;

  copyIdBtn.onclick = () => navigator.clipboard.writeText(u.id);
}

if (closeModal) closeModal.onclick = () => modal.classList.add("hidden");

btnTop.onclick = () => {
  isGlobal = false;
  btnTop.classList.add("active");
  btnGlobal.classList.remove("active");

  pagination?.classList.add("hidden");
  pagination && (pagination.style.display = "none");

  applyFilterAndRender();
};

btnGlobal.onclick = () => {
  isGlobal = true;
  btnGlobal.classList.add("active");
  btnTop.classList.remove("active");
  applyFilterAndRender();
};

nextPageBtn.onclick = () => {
  if (!isGlobal) return;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  if (currentPage >= totalPages) return;
  currentPage++;
  render();
};

prevPageBtn.onclick = () => {
  if (!isGlobal) return;
  if (currentPage <= 1) return;
  currentPage--;
  render();
};

searchInput.oninput = () => applyFilterAndRender();

onAuthStateChanged(auth, async (user) => {
  if (!user || user.isAnonymous) {
    try {
      if (user?.isAnonymous) await signOut(auth);
    } catch {}

    showLoginGate();
    return;
  }

  hideLoginGate();

  await loadBadges();
  await loadRanking();
});

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}