const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("nav");
const cardContainer = document.getElementById("cardContainer");

hamburger?.addEventListener("click", () => {
  const expanded = hamburger.classList.toggle("open");
  nav?.classList.toggle("open");

  hamburger.setAttribute("aria-expanded", String(expanded));
  cardContainer?.setAttribute("aria-hidden", String(!expanded));
});

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  if (typeof anime === "undefined") return;

  anime
    .timeline({ easing: "easeOutCubic", duration: 800 })
    .add({
      targets: ".hero-title",
      translateY: [-18, 0],
      opacity: [0, 1],
    })
    .add(
      {
        targets: ".hero-sub",
        translateY: [-10, 0],
        opacity: [0, 1],
      },
      "-=450",
    )
    .add(
      {
        targets: ".hero-cta .btn",
        translateY: [8, 0],
        opacity: [0, 1],
        delay: anime.stagger(90),
      },
      "-=420",
    )
    .add(
      {
        targets: ".card-card",
        translateY: [10, 0],
        opacity: [0, 1],
      },
      "-=500",
    );
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("in-view");
    });
  },
  { threshold: 0.15 },
);

document
  .querySelectorAll(".reveal")
  .forEach((el) => revealObserver.observe(el));

(function canvasParticles() {
  const canvas = document.getElementById("fondoAnimado");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  let w = (canvas.width = canvas.offsetWidth);
  let h = (canvas.height = canvas.offsetHeight);

  const particles = [];
  const particleCount = Math.max(30, Math.floor((w * h) / 60000));

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  class P {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = rand(0, w);
      this.y = rand(0, h);
      this.r = rand(1, 3.6);
      this.vx = rand(-0.3, 0.3);
      this.vy = rand(-0.15, 0.15);
      this.alpha = rand(0.08, 0.28);
      this.hh = rand(160, 200);
      this.s = rand(60, 90);
      this.l = rand(50, 70);
    }
    step() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -20 || this.x > w + 20 || this.y < -20 || this.y > h + 20)
        this.reset();
    }
    draw() {
      ctx.beginPath();
      const g = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        this.r * 8,
      );
      g.addColorStop(0, `hsla(${this.hh},${this.s}%,${this.l}%,${this.alpha})`);
      g.addColorStop(1, `hsla(${this.hh},${this.s}%,${this.l}%,0)`);
      ctx.fillStyle = g;
      ctx.arc(this.x, this.y, this.r * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function init() {
    particles.length = 0;
    for (let i = 0; i < particleCount; i++) particles.push(new P());
  }

  let raf = null;

  function loop() {
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "rgba(6,8,20,0.45)";
    ctx.fillRect(0, 0, w, h);

    for (const p of particles) {
      p.step();
      p.draw();
    }
    raf = requestAnimationFrame(loop);
  }

  function resize() {
    if (raf) cancelAnimationFrame(raf);
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
    init();
    loop();
  }

  init();
  loop();

  window.addEventListener("resize", resize);
})();

document.querySelectorAll(".video-nav").forEach((btn) => {
  btn.addEventListener("click", () => {
    const track = btn.parentElement.querySelector(".video-track");
    const dir = Number(btn.dataset.dir || 0);
    track.scrollBy({ left: dir * 320, behavior: "smooth" });
  });
});

(() => {
  const track = document.getElementById("videoTrack");
  if (!track) return;

  const PAGE_STEP = 2;
  const AUTO_STEP_PX = 0.6;
  const AUTO_MAX_FPS = 60;
  let rafId = null;

  let isPaused = false;

  const original = Array.from(track.children);
  original.forEach((node) => track.appendChild(node.cloneNode(true)));

  const getCardWidth = () => {
    const card = track.querySelector(".video-card");
    if (!card) return 320;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap || "16") || 16;
    return card.getBoundingClientRect().width + gap;
  };

  const scrollByCards = (count) => {
    track.scrollBy({ left: count * getCardWidth(), behavior: "smooth" });
  };

  const normalizeInfinite = () => {
    const half = track.scrollWidth / 2;
    if (track.scrollLeft >= half) track.scrollLeft -= half;
    if (track.scrollLeft < 0) track.scrollLeft += half;
  };

  document.querySelectorAll(".video-nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = Number(btn.dataset.dir || 0);

      anime({
        targets: btn,
        scale: [1, 0.9, 1],
        duration: 260,
        easing: "easeOutQuad",
      });

      const ico = btn.querySelector(".nav-ico");
      if (ico) {
        anime({
          targets: ico,
          translateX: [0, dir * 6, 0],
          duration: 300,
          easing: "easeOutQuad",
        });
      }

      scrollByCards(dir * PAGE_STEP);
    });
  });

  let last = performance.now();
  const tick = (now) => {
    if (!isPaused) {
      const dt = Math.min(1000 / AUTO_MAX_FPS, now - last);
      track.scrollLeft += AUTO_STEP_PX * (dt / (1000 / 60));
      normalizeInfinite();
    }
    last = now;
    rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (rafId) return;
    last = performance.now();
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  };

  track.addEventListener("mouseenter", () => {
    isPaused = true;
    anime({
      targets: track,
      scale: [1, 0.995, 1],
      duration: 350,
      easing: "easeOutQuad",
    });
  });

  track.addEventListener("mouseleave", () => {
    isPaused = false;
  });

  document.querySelectorAll(".video-nav").forEach((btn) => {
    btn.addEventListener("mouseenter", () => (isPaused = true));
    btn.addEventListener("mouseleave", () => (isPaused = false));
  });

  track.addEventListener(
    "scroll",
    () => {
      normalizeInfinite();
    },
    { passive: true },
  );

  track.scrollLeft = 0;
  start();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
})();
