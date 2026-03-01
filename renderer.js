(() => {
  "use strict";

  // ── Constants ──────────────────────────────────
  const RADIUS = 88;
  const STROKE = 6;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const TICKS = [0, 25, 50, 75];

  // ── Schedule config ────────────────────────────
  // Actual: sleep 2 AM, wake 10 AM
  // Healthy: sleep 10 PM, wake 6 AM
  // Offset: 4 hours (actual wake - healthy wake)
  const SCHEDULE_OFFSET_MS = 4 * 60 * 60 * 1000;

  // ── DOM refs ───────────────────────────────────
  const $ambientGlow   = document.getElementById("ambientGlow");
  const $mainContainer = document.getElementById("mainContainer");
  const $ringProgress  = document.getElementById("ringProgress");
  const $tickMarks     = document.getElementById("tickMarks");
  const $pctNumber     = document.getElementById("pctNumber");
  const $clockTime     = document.getElementById("clockTime");
  const $equivValue    = document.getElementById("equivValue");
  const $phaseDot      = document.getElementById("phaseDot");
  const $phaseLabel    = document.getElementById("phaseLabel");
  const $minsLeft      = document.getElementById("minsLeft");
  const $seg0          = document.getElementById("seg0");
  const $seg1          = document.getElementById("seg1");
  const $seg2          = document.getElementById("seg2");
  const $seg3          = document.getElementById("seg3");
  const $infoBtn       = document.getElementById("infoBtn");
  const $infoPanel     = document.getElementById("infoPanel");

  const segments = [$seg0, $seg1, $seg2, $seg3];

  // ── Helpers ────────────────────────────────────
  function getHourPercent() {
    const now = new Date();
    return ((now.getMinutes() * 60 + now.getSeconds()) / 3600) * 100;
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getEquivalentTime(now) {
    return new Date(now.getTime() - SCHEDULE_OFFSET_MS);
  }

  function getPhaseColor(pct) {
    if (pct < 25) return { ring: "#4ADE80", glow: "rgba(74,222,128,0.15)",  label: "fresh"   };
    if (pct < 50) return { ring: "#FACC15", glow: "rgba(250,204,21,0.12)",  label: "flowing"  };
    if (pct < 75) return { ring: "#FB923C", glow: "rgba(251,146,60,0.12)",  label: "ticking"  };
    return            { ring: "#F87171", glow: "rgba(248,113,113,0.15)", label: "closing"  };
  }

  // ── Build tick marks (once) ────────────────────
  function buildTicks() {
    const ns = "http://www.w3.org/2000/svg";
    TICKS.forEach((tick) => {
      const angle = (tick / 100) * 360 - 90;
      const rad   = (angle * Math.PI) / 180;
      const x1    = 110 + 96 * Math.cos(rad);
      const y1    = 110 + 96 * Math.sin(rad);
      const x2    = 110 + 88 * Math.cos(rad);
      const y2    = 110 + 88 * Math.sin(rad);

      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", "#27272A");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-linecap", "round");
      line.classList.add("tick-mark");
      line.dataset.tick = tick;
      $tickMarks.appendChild(line);
    });
  }

  // ── State ──────────────────────────────────────
  let prevPct = getHourPercent();
  let infoVisible = false;

  // ── Update loop ────────────────────────────────
  function update() {
    const pct       = getHourPercent();
    const now       = new Date();
    const phase     = getPhaseColor(pct);
    const displayPct = Math.floor(pct);
    const minsLeft  = Math.ceil(((100 - pct) / 100) * 60);
    const dashOffset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

    // Flash detection at quarter boundaries
    if (
      (prevPct < 25 && pct >= 25) ||
      (prevPct < 50 && pct >= 50) ||
      (prevPct < 75 && pct >= 75) ||
      (prevPct > 90 && pct < 10)
    ) {
      $mainContainer.classList.add("flash");
      setTimeout(() => $mainContainer.classList.remove("flash"), 800);
    }
    prevPct = pct;

    // Ring progress
    $ringProgress.setAttribute("stroke-dashoffset", dashOffset);
    $ringProgress.setAttribute("stroke", phase.ring);
    $ringProgress.style.filter = `drop-shadow(0 0 6px ${phase.ring}40)`;

    // Tick mark colors
    $tickMarks.querySelectorAll(".tick-mark").forEach((el) => {
      const tick = Number(el.dataset.tick);
      el.setAttribute("stroke", pct >= tick ? phase.ring : "#27272A");
    });

    // Center content
    $pctNumber.textContent = displayPct;
    $clockTime.textContent = formatTime(now);
    $equivValue.textContent = formatTime(getEquivalentTime(now));

    // Ambient glow
    $ambientGlow.style.background = phase.glow;

    // Phase indicator
    $phaseDot.style.backgroundColor = phase.ring;
    $phaseDot.style.boxShadow = `0 0 8px ${phase.ring}60`;
    $phaseLabel.style.color = phase.ring;
    $phaseLabel.textContent = phase.label;
    $minsLeft.textContent = `${minsLeft}m left`;

    // Segment bar
    TICKS.forEach((seg, i) => {
      if (pct >= seg + 25) {
        segments[i].style.backgroundColor = phase.ring;
      } else if (pct >= seg) {
        segments[i].style.backgroundColor = `${phase.ring}60`;
      } else {
        segments[i].style.backgroundColor = "#1C1C1E";
      }
    });
  }

  // ── Info toggle ────────────────────────────────
  $infoBtn.addEventListener("click", () => {
    infoVisible = !infoVisible;
    $infoPanel.classList.toggle("visible", infoVisible);
    $infoBtn.textContent = infoVisible ? "hide" : "why 100?";
  });

  $infoPanel.addEventListener("click", () => {
    infoVisible = false;
    $infoPanel.classList.remove("visible");
    $infoBtn.textContent = "why 100?";
  });

  // ── Init ───────────────────────────────────────
  buildTicks();
  update();
  setInterval(update, 1000);
})();
