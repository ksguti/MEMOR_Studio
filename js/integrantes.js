document.addEventListener("DOMContentLoaded", () => {
  const slideTrack = document.getElementById("carouselSlide");
  const slides = Array.from(
    document.querySelectorAll(".carousel-container .slide"),
  );

  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");

  const dotsBox = document.getElementById("dots");
  let index = 0;
  let autoSlide = null;

  if (!slideTrack || slides.length === 0) return;

  const dots = slides.map((_, i) => {
    const dot = document.createElement("button");
    dot.className = "dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Ir a slide ${i + 1}`);
    dot.addEventListener("click", () => {
      index = i;
      render();
      restartAuto();
    });
    dotsBox.appendChild(dot);
    return dot;
  });

  function render() {
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;

    slideTrack.style.transform = `translateX(-${index * 100}%)`;

    dots.forEach((d) => d.classList.remove("active"));
    dots[index]?.classList.add("active");
  }

  function startAuto() {
    stopAuto();
    autoSlide = setInterval(() => {
      index++;
      render();
    }, 5000);
  }

  function stopAuto() {
    if (autoSlide) clearInterval(autoSlide);
    autoSlide = null;
  }

  function restartAuto() {
    startAuto();
  }

  next?.addEventListener("click", () => {
    index++;
    render();
    restartAuto();
  });

  prev?.addEventListener("click", () => {
    index--;
    render();
    restartAuto();
  });

  const carousel = document.querySelector(".carousel-container");
  carousel?.addEventListener("mouseenter", stopAuto);
  carousel?.addEventListener("mouseleave", startAuto);

  render();
  startAuto();
});
