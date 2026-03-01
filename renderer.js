(() => {
  "use strict";

  // ── Constants ──────────────────────────────────
  const RADIUS = 88;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const TICKS = [0, 25, 50, 75];
  const STORAGE_KEY = "driftShift";

  // ── DOM refs ───────────────────────────────────
  const $ambientGlow   = document.getElementById("ambientGlow");
  const $mainContainer = document.getElementById("mainContainer");
  const $ringProgress  = document.getElementById("ringProgress");
  const $tickMarks     = document.getElementById("tickMarks");
  const $pctNumber     = document.getElementById("pctNumber");
  const $clockTime     = document.getElementById("clockTime");
  const $localTime     = document.getElementById("localTime");
  const $localValue    = document.getElementById("localValue");
  const $phaseDot      = document.getElementById("phaseDot");
  const $phaseLabel    = document.getElementById("phaseLabel");
  const $minsLeft      = document.getElementById("minsLeft");
  const $seg0          = document.getElementById("seg0");
  const $seg1          = document.getElementById("seg1");
  const $seg2          = document.getElementById("seg2");
  const $seg3          = document.getElementById("seg3");
  const $infoBtn       = document.getElementById("infoBtn");
  const $infoPanel     = document.getElementById("infoPanel");
  const $shiftBtn      = document.getElementById("shiftBtn");
  const $shiftPanel    = document.getElementById("shiftPanel");
  const $actualWake    = document.getElementById("actualWake");
  const $idealWake     = document.getElementById("idealWake");
  const $shiftPreview  = document.getElementById("shiftPreview");
  const $shiftCancel   = document.getElementById("shiftCancel");
  const $shiftOff      = document.getElementById("shiftOff");
  const $shiftStart    = document.getElementById("shiftStart");

  const segments = [$seg0, $seg1, $seg2, $seg3];

  // ── Shift persistence ─────────────────────────
  function loadShiftConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const cfg = JSON.parse(raw);
      if (cfg && typeof cfg.actualWake === "string" && typeof cfg.idealWake === "string"
          && typeof cfg.offsetMinutes === "number" && typeof cfg.enabled === "boolean") {
        return cfg;
      }
      return null;
    } catch {
      return null;
    }
  }

  function saveShiftConfig(actualWake, idealWake, offsetMinutes, enabled) {
    const cfg = { actualWake, idealWake, offsetMinutes, enabled };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    return cfg;
  }

  function disableShift() {
    const cfg = loadShiftConfig();
    if (cfg) {
      cfg.enabled = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    }
    return cfg;
  }

  // ── Offset calculation ────────────────────────
  function calcOffsetMinutes(actualWake, idealWake) {
    const [ah, am] = actualWake.split(":").map(Number);
    const [ih, im] = idealWake.split(":").map(Number);
    let diff = (ah * 60 + am) - (ih * 60 + im);
    // Normalize to -720..+720 (±12 hours)
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    return diff;
  }

  function formatOffset(minutes) {
    const sign = minutes >= 0 ? "+" : "-";
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `shift: ${sign}${h}h ${String(m).padStart(2, "0")}m`;
  }

  function getShiftedTime(now, offsetMinutes) {
    return new Date(now.getTime() - offsetMinutes * 60 * 1000);
  }

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

  // ── Shift UI state ────────────────────────────
  function applyShiftState() {
    const cfg = loadShiftConfig();
    const active = cfg && cfg.enabled;

    // Toggle local-time visibility
    $localTime.classList.toggle("visible", !!active);

    // Toggle shift button appearance
    $shiftBtn.classList.toggle("active", !!active);
    $shiftBtn.textContent = active ? "shift on" : "time shift";
  }

  // ── State ──────────────────────────────────────
  let prevPct = getHourPercent();
  let infoVisible = false;
  let shiftVisible = false;

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

    // Center content — conditional on shift state
    const cfg = loadShiftConfig();
    if (cfg && cfg.enabled) {
      // Shifted: prominent time is the shifted time, real time is secondary
      $clockTime.textContent = formatTime(getShiftedTime(now, cfg.offsetMinutes));
      $localValue.textContent = formatTime(now);
    } else {
      // Default: just real time
      $clockTime.textContent = formatTime(now);
    }

    $pctNumber.textContent = displayPct;

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

  // ── Panel helpers ─────────────────────────────
  function closeInfoPanel() {
    infoVisible = false;
    $infoPanel.classList.remove("visible");
    $infoBtn.textContent = "why 100?";
  }

  function closeShiftPanel() {
    shiftVisible = false;
    $shiftPanel.classList.remove("visible");
  }

  function updateShiftPreview() {
    const actual = $actualWake.value;
    const ideal = $idealWake.value;
    if (!actual || !ideal) return;
    const offset = calcOffsetMinutes(actual, ideal);
    $shiftPreview.textContent = formatOffset(offset);
    $shiftPreview.classList.toggle("zero", offset === 0);
  }

  function openShiftPanel() {
    // Mutual exclusion: close info panel
    closeInfoPanel();

    // Pre-fill from saved config
    const cfg = loadShiftConfig();
    if (cfg) {
      $actualWake.value = cfg.actualWake;
      $idealWake.value = cfg.idealWake;
    }

    // Show/hide "turn off" button based on whether shift is currently active
    $shiftOff.classList.toggle("visible", !!(cfg && cfg.enabled));

    updateShiftPreview();
    shiftVisible = true;
    $shiftPanel.classList.add("visible");
  }

  // ── Info toggle ────────────────────────────────
  $infoBtn.addEventListener("click", () => {
    if (infoVisible) {
      closeInfoPanel();
    } else {
      // Mutual exclusion: close shift panel
      closeShiftPanel();
      infoVisible = true;
      $infoPanel.classList.add("visible");
      $infoBtn.textContent = "hide";
    }
  });

  $infoPanel.addEventListener("click", () => {
    closeInfoPanel();
  });

  // ── Shift panel handlers ──────────────────────
  $shiftBtn.addEventListener("click", () => {
    if (shiftVisible) {
      closeShiftPanel();
    } else {
      openShiftPanel();
    }
  });

  $actualWake.addEventListener("input", updateShiftPreview);
  $idealWake.addEventListener("input", updateShiftPreview);

  $shiftCancel.addEventListener("click", () => {
    closeShiftPanel();
  });

  $shiftStart.addEventListener("click", () => {
    const actual = $actualWake.value;
    const ideal = $idealWake.value;
    if (!actual || !ideal) return;
    const offset = calcOffsetMinutes(actual, ideal);
    saveShiftConfig(actual, ideal, offset, true);
    closeShiftPanel();
    applyShiftState();
    update();
  });

  $shiftOff.addEventListener("click", () => {
    disableShift();
    closeShiftPanel();
    applyShiftState();
    update();
  });

  // ── Init ───────────────────────────────────────
  buildTicks();
  applyShiftState();
  update();
  setInterval(update, 1000);
})();
