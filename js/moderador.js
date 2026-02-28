import { app } from "./firebase.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const list = document.getElementById("list");
const searchInput = document.getElementById("searchInput");
const toast = document.getElementById("toast");

const btnBetas = document.getElementById("btnBetas");
const btnAffiliations = document.getElementById("btnAffiliations");
const btnAccepted = document.getElementById("btnAccepted");
const backProfile = document.getElementById("backProfile");
const logout = document.getElementById("logout");

let currentView = "betas";
let hideToastTimer = null;

function setToast(message, type = "success") {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(hideToastTimer);
  hideToastTimer = setTimeout(() => {
    toast.className = "toast";
    toast.textContent = "";
  }, 3500);
}

function setActiveViewButton(view) {
  [btnBetas, btnAffiliations, btnAccepted].forEach(b => b.classList.remove("active"));
  if (view === "betas") btnBetas.classList.add("active");
  if (view === "affiliations") btnAffiliations.classList.add("active");
  if (view === "accepted") btnAccepted.classList.add("active");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "login.html";

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists() || !["moderator", "admin"].includes(snap.data().role)) {
    alert("No autorizado");
    await signOut(auth);
    return;
  }

  setActiveViewButton(currentView);
  await loadRequests();
});

btnBetas.onclick = () => switchView("betas");
btnAffiliations.onclick = () => switchView("affiliations");
btnAccepted.onclick = () => switchView("accepted");

function switchView(view) {
  currentView = view;
  setActiveViewButton(view);
  loadRequests();
}

async function loadRequests() {
  list.innerHTML = "";
  setToast("", "success");

  let ref;
  if (currentView === "betas") {
    ref = query(collection(db, "betas"), where("status", "==", "pending"));
  } else if (currentView === "affiliations") {
    ref = query(collection(db, "affiliations"), where("status", "==", "pending"));
  } else {
    ref = collection(db, "accepted");
  }

  const snap = await getDocs(ref);

  for (const d of snap.docs) {
    const data = d.data();

    let fullName = data.minecraftUser || "Sin nombre";
    if (data.userId) {
      const u = await getDoc(doc(db, "users", data.userId));
      if (u.exists()) fullName = u.data().fullName || fullName;
    }

    renderAccordion(d.id, data, fullName);
  }

  applySearchFilter();
}

function renderAccordion(id, data, fullName) {
  const accordion = document.createElement("div");
  accordion.className = "accordion";

  const uid = (data.userId || "").toString();
  const mc = (data.minecraftUser || "").toString();
  const email = (data.email || "").toString();
  const discord = (data.discordUser || "").toString();
  const name = (fullName || "").toString();

  accordion.dataset.search = `${name} ${mc} ${uid} ${email} ${discord}`.toLowerCase();

  const header = document.createElement("div");
  header.className = "accordion-header";

  header.innerHTML = `
    <strong>${name || mc || "Sin nombre"}</strong>
    <span class="status ${currentView === "accepted" ? "accepted" : "pending"}">
      ${currentView === "accepted" ? "Aceptado" : "Pendiente"}
    </span>
  `;

  const body = document.createElement("div");
  body.className = "accordion-body";

  body.innerHTML = `
    <p><b>UID</b> <span>${uid || "-"}</span></p>
    <p><b>Email</b> <span>${email || "-"}</span></p>
    <p><b>Minecraft</b> <span>${mc || "-"}</span></p>
    <p><b>Discord</b> <span>${discord || "-"}</span></p>

    ${data.country ? `<p><b>País</b> <span>${data.country}</span></p>` : ""}
    ${data.source ? `<p><b>Fuente</b> <span>${data.source}</span></p>` : ""}
    ${data.experience ? `<p><b>Experiencia</b> <span>${data.experience}</span></p>` : ""}
    ${data.motivation ? `<p><b>Motivación</b> <span>${data.motivation}</span></p>` : ""}

    <div class="actions"></div>
  `;

  header.onclick = () => {
    document.querySelectorAll(".accordion-body").forEach(b => {
      if (b !== body) b.classList.remove("open");
    });
    body.classList.toggle("open");
  };

  accordion.append(header, body);
  list.appendChild(accordion);

  const actions = body.querySelector(".actions");

  if (currentView !== "accepted") {
    const accept = document.createElement("button");
    accept.textContent = "Aceptar";
    accept.onclick = () => acceptRequest(id, data);

    const reject = document.createElement("button");
    reject.textContent = "Rechazar";
    reject.onclick = () => rejectRequest(id);

    actions.append(accept, reject);
  } else {
    const resend = document.createElement("button");
    resend.textContent = "Enviar al correo";
    resend.onclick = () => sendEmail(data);

    const remove = document.createElement("button");
    remove.textContent = "Eliminar";
    remove.onclick = () => deleteAccepted(id);

    actions.append(resend, remove);
  }
}

async function sendEmail(data) {
  try {
    await emailjs.send(" #codigo de Emailjs poner aqui", ". . .", {
      to_email: data.email,
      minecraft_user: data.minecraftUser || "",
      discord_user: data.discordUser || ""
    });
    setToast("Correo enviado con éxito.", "success");
  } catch (e) {
    setToast("No se pudo enviar el correo. Revisa EmailJS o la conexión.", "error");
  }
}

async function acceptRequest(id, data) {
  await addDoc(collection(db, "accepted"), {
    ...data,
    status: "accepted",
    acceptedAt: serverTimestamp()
  });

  await deleteDoc(doc(db, currentView, id));
  loadRequests();
}

async function rejectRequest(id) {
  await deleteDoc(doc(db, currentView, id));
  loadRequests();
}

async function deleteAccepted(id) {
  await deleteDoc(doc(db, "accepted", id));
  loadRequests();
}

function applySearchFilter() {
  const v = searchInput.value.trim().toLowerCase();
  document.querySelectorAll(".accordion").forEach(card => {
    const haystack = card.dataset.search || "";
    card.style.display = haystack.includes(v) ? "block" : "none";
  });
}

searchInput.addEventListener("input", applySearchFilter);

backProfile.onclick = () => location.href = "perfil.html";
logout.onclick = async () => {
  await signOut(auth);
  location.href = "login.html";
};