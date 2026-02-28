import { app } from "./firebase.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");
const adminBtn = document.getElementById("adminBtn");
const modBtn = document.getElementById("modBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user || user.isAnonymous) {
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) throw "Perfil no encontrado";

    const data = snap.data();

    document.getElementById("fullName").textContent = data.fullName;
    document.getElementById("userRole").textContent = `Rol: ${data.role}`;
    document.getElementById("minecraftName").textContent = data.minecraft;
    document.getElementById("birthDate").textContent = data.birthDate;
    document.getElementById("warns").textContent = data.warns ?? 0;
    document.getElementById("points").textContent = `${data.points} puntos`;
    document.getElementById("rankingPos").textContent =
      "Ranking: calculando...";

    document.getElementById("banner").src =
      `img/banners/${data.banner || "default.png"}`;

    const skinImg = document.getElementById("skin");
    const premiumBadge = document.getElementById("premiumBadge");
    const downloadBtn = document.getElementById("downloadSkinBtn");

    if (data.isPremium) {
      skinImg.src = `https://mc-heads.net/avatar/${data.minecraft}/128`;
      premiumBadge.src = "icon/premium.png";
      premiumBadge.style.display = "block";
      downloadBtn.style.display = "inline-block";
      downloadBtn.onclick = () =>
        window.open(
          `https://mc-heads.net/download/${data.minecraft}`,
          "_blank",
        );
    } else {
      skinImg.src = "img/skins/default.jpg";
      premiumBadge.src = "icon/non-premium.png";
      premiumBadge.style.display = "block";
      downloadBtn.style.display = "none";
    }

    document.getElementById("copyUserIdBtn").onclick = async () => {
      await navigator.clipboard.writeText(user.uid);
      alert("ID de usuario copiado");
    };

    const mcBtn = document.getElementById("mcNameBtn");
    if (mcBtn) {
      mcBtn.onclick = async () => {
        await navigator.clipboard.writeText(data.minecraft);
        alert("Nombre de Minecraft copiado");
      };
    }

    if (data.role === "admin") adminBtn.style.display = "inline-block";
    if (data.role === "moderator") modBtn.style.display = "inline-block";

    await loadBadges(data.badges || []);

    const linkForm = document.getElementById("discord-link-form");
    const linkedBox = document.getElementById("discord-linked");
    const discordStatus = document.getElementById("discordStatus");

    if (data.discord?.id) {
      linkForm.style.display = "none";
      linkedBox.style.display = "block";

      if (data.discord.inServer === true) {
        discordStatus.textContent = `✅ Vinculado como ${data.discord.username} (en el servidor)`;
        discordStatus.style.color = "#43b581";
      } else {
        discordStatus.textContent = `⚠️ Vinculado como ${data.discord.username} (fuera del servidor)`;
        discordStatus.style.color = "#faa61a";
      }
    } else {
      linkForm.style.display = "block";
      linkedBox.style.display = "none";
    }

    const linkBtn = document.getElementById("linkDiscordBtn");

    linkBtn.onclick = async () => {
      const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userSnap.data()?.discord?.id) {
        alert("Tu cuenta ya está vinculada a Discord");
        return;
      }

      const code = document
        .getElementById("discordCode")
        .value.trim()
        .toUpperCase();

      if (!code) return alert("Ingresa el código");

      const ref = doc(db, "discord_links", code);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Código inválido o expirado");
        return;
      }

      const discordData = snap.data();

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        discord: {
          id: discordData.discordId,
          username: discordData.username,
          inServer: true,
          linkedAt: Date.now(),
        },
      });

      await deleteDoc(ref);

      alert(`✅ Vinculado como ${discordData.username}`);
      location.reload();
    };

    const rankingSnap = await getDocs(
      query(collection(db, "users"), orderBy("points", "desc")),
    );

    const discordText = document.getElementById("discord-text");

    if (data.discord?.inServer === true) {
      discordText.textContent =
        "✅ En el servidor oficial de MEMOR Studio Club";
      discordText.style.color = "#43b581";
    } else {
      discordText.textContent =
        "❌ No está en el servidor oficial de MEMOR Studio Club";
      discordText.style.color = "#f04747";
    }

    let pos = 1;
    rankingSnap.forEach((d) => {
      if (d.id === user.uid) {
        document.getElementById("rankingPos").textContent = `Ranking #${pos}`;
      }
      pos++;
    });
  } catch (err) {
    console.error(err);
    alert(
      "Tu perfil fue eliminado del sistema. Abre un ticket en Discord (MEMOR Studio Club).",
    );
  }
});

const BADGE_QUALITY_MAP = {
  comun: {
    class: "badge-verde",
    label: "Insignia Común",
  },
  epico: {
    class: "badge-morado",
    label: "Insignia Épica",
  },
  mitico: {
    class: "badge-rojo",
    label: "Insignia Mítica",
  },
  legendario: {
    class: "badge-amarillo",
    label: "Insignia Legendaria",
  },
};

async function loadBadges(userBadges) {
  const box = document.querySelector(".badges");
  box.innerHTML = "";

  const snap = await getDocs(collection(db, "badges"));

  snap.forEach((docu) => {
    if (!userBadges.includes(docu.id)) return;

    const b = docu.data();

    const qKey = (b.quality || "comun").toLowerCase();
    const quality = BADGE_QUALITY_MAP[qKey] || BADGE_QUALITY_MAP.comun;

    const card = document.createElement("div");
    card.className = "badge-card";

    card.innerHTML = `
      <img src="img/insignias/${b.image}">
      <div class="info-panel">
        <h3>${b.name}</h3>
        <p>${b.description}</p>
        <span class="${quality.class}">
          ${quality.label}
        </span>
      </div>
    `;

    box.appendChild(card);
  });
}

logoutBtn.onclick = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

homeBtn.onclick = () => (window.location.href = "index.html");
modBtn.onclick = () => (window.location.href = "moderador.html");
adminBtn.onclick = () => (window.location.href = "admin.html");
