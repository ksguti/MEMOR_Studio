const GUILD_ID = "1447607420951203892";
const WIDGET_JSON = `https://discord.com/api/guilds/${GUILD_ID}/widget.json`;

(function miniCarousel() {
  const track = document.getElementById("miniTrack");
  const dotsWrap = document.getElementById("miniDots");
  if (!track || !dotsWrap) return;

  const dots = Array.from(dotsWrap.querySelectorAll("button"));
  const slidesCount = track.children.length;

  let idx = 0;
  let timer = null;

  function paint() {
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
  }

  function go(n) {
    idx = (n + slidesCount) % slidesCount;
    paint();
  }

  function start() {
    stop();
    timer = setInterval(() => go(idx + 1), 4500);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  dots.forEach((d, i) =>
    d.addEventListener("click", () => {
      go(i);
      start();
    }),
  );

  const box = document.getElementById("miniCarousel");
  box?.addEventListener("mouseenter", stop);
  box?.addEventListener("mouseleave", start);

  paint();
  start();
})();

(async function loadDiscordWidget() {
  const srvName = document.getElementById("srvName");
  const srvOnline = document.getElementById("srvOnline");
  const srvChannels = document.getElementById("srvChannels");
  const srvInvite = document.getElementById("srvInvite");

  const joinBtn = document.getElementById("joinBtn");
  const channelsList = document.getElementById("channelsList");

  const statusPill = document.getElementById("serverStatusPill");
  const dot = document.getElementById("serverDot");
  const statusText = document.getElementById("serverStatusText");

  function setStatus(ok, text) {
    if (statusText) statusText.textContent = text;
    if (dot) dot.classList.toggle("online", !!ok);
    if (statusPill)
      statusPill.title = ok ? "Widget disponible" : "Widget no disponible";
  }

  try {
    setStatus(false, "Cargando…");

    const res = await fetch(WIDGET_JSON, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Widget no disponible (HTTP ${res.status})`);
    }

    const data = await res.json();

    if (srvName) srvName.textContent = data.name || "MEMOR Studio Club";

    const online = Number(data.presence_count ?? 0);
    if (srvOnline) srvOnline.textContent = `${online} en línea`;

    const channels = Array.isArray(data.channels) ? data.channels : [];
    if (srvChannels) srvChannels.textContent = `${channels.length}`;

    const invite = data.instant_invite || "";
    if (invite) {
      if (srvInvite) srvInvite.textContent = "Disponible ✅";
      if (joinBtn) joinBtn.href = invite;
    } else {
      if (srvInvite) srvInvite.textContent = "No disponible";
    }

    if (channelsList) {
      channelsList.innerHTML = "";

      if (!channels.length) {
        channelsList.innerHTML = `
          <div class="channel-row">
            <div class="channel-left">
              <span class="hash">#</span>
              <span class="channel-name">No hay canales públicos en el widget</span>
            </div>
            <span class="channel-users">—</span>
          </div>
        `;
      } else {
        channels.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        const shown = channels.slice(0, 10);

        for (const ch of shown) {
          const name = ch.name || "canal";
          const users = ch.users?.length ?? null;

          const row = document.createElement("div");
          row.className = "channel-row";
          row.innerHTML = `
            <div class="channel-left">
              <span class="hash">#</span>
              <span class="channel-name">${escapeHtml(name)}</span>
            </div>
            <span class="channel-users">${users === null ? "" : `${users} usuarios`}</span>
          `;
          channelsList.appendChild(row);
        }
      }
    }

    setStatus(true, "Online");
  } catch (err) {
    console.error(err);

    if (srvName) srvName.textContent = "MEMOR Studio Club";
    if (srvOnline) srvOnline.textContent = "—";
    if (srvChannels) srvChannels.textContent = "—";
    if (srvInvite) srvInvite.textContent = "Requiere widget";

    if (channelsList) {
      channelsList.innerHTML = `
        <div class="channel-row">
          <div class="channel-left">
            <span class="hash">#</span>
            <span class="channel-name">No se pudo cargar el widget.json</span>
          </div>
          <span class="channel-users">Activa el Widget en Discord</span>
        </div>
      `;
    }

    setStatus(false, "Widget no disponible");
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
