import { useState, useEffect, useRef } from "react";

const RADIUS = 88;
const STROKE = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getHourPercent() {
  const now = new Date();
  return ((now.getMinutes() * 60 + now.getSeconds()) / 3600) * 100;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getPhaseColor(pct) {
  if (pct < 25) return { ring: "#4ADE80", glow: "rgba(74,222,128,0.15)", label: "fresh" };
  if (pct < 50) return { ring: "#FACC15", glow: "rgba(250,204,21,0.12)", label: "flowing" };
  if (pct < 75) return { ring: "#FB923C", glow: "rgba(251,146,60,0.12)", label: "ticking" };
  return { ring: "#F87171", glow: "rgba(248,113,113,0.15)", label: "closing" };
}

function getNextHourEvent(pct) {
  if (pct < 25) return "Quarter at 25%";
  if (pct < 50) return "Halfway at 50%";
  if (pct < 75) return "Three-quarter at 75%";
  return "New hour at 100%";
}

export default function Drift() {
  const [pct, setPct] = useState(getHourPercent());
  const [now, setNow] = useState(new Date());
  const [showInfo, setShowInfo] = useState(false);
  const prevPctRef = useRef(pct);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const newPct = getHourPercent();
      const prev = prevPctRef.current;

      if (
        (prev < 25 && newPct >= 25) ||
        (prev < 50 && newPct >= 50) ||
        (prev < 75 && newPct >= 75) ||
        (prev > 90 && newPct < 10)
      ) {
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      }

      prevPctRef.current = newPct;
      setPct(newPct);
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const phase = getPhaseColor(pct);
  const dashOffset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  const displayPct = Math.floor(pct);
  const minsLeft = Math.ceil((100 - pct) / 100 * 60);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#0A0A0B",
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      color: "#E4E4E7",
      overflow: "hidden",
      position: "relative",
      userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes flashBorder { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); } 50% { box-shadow: 0 0 40px 8px rgba(255,255,255,0.15); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
        @keyframes subtlePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.01); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .ring-track { transition: stroke 0.8s ease; }
        .ring-progress { transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.8s ease; }
        .phase-label { transition: color 0.8s ease, background 0.8s ease; }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: phase.glow,
        filter: "blur(80px)",
        transition: "background 1s ease",
        animation: "subtlePulse 4s ease-in-out infinite",
      }} />

      {/* Main container */}
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
        animation: "fadeIn 0.6s ease-out",
        ...(flash ? { animation: "flashBorder 0.8s ease-out" } : {}),
      }}>

        {/* Title */}
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#52525B",
        }}>
          drift
        </div>

        {/* Ring + Percentage */}
        <div style={{ position: "relative", width: 220, height: 220 }}>
          {/* Decorative outer ring */}
          <svg width="220" height="220" style={{
            position: "absolute",
            top: 0,
            left: 0,
            animation: "spin 120s linear infinite",
            opacity: 0.08,
          }}>
            <circle cx="110" cy="110" r="105" fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="2 8" />
          </svg>

          {/* Tick marks */}
          <svg width="220" height="220" style={{ position: "absolute", top: 0, left: 0 }}>
            {[0, 25, 50, 75].map((tick) => {
              const angle = (tick / 100) * 360 - 90;
              const rad = (angle * Math.PI) / 180;
              const x1 = 110 + 96 * Math.cos(rad);
              const y1 = 110 + 96 * Math.sin(rad);
              const x2 = 110 + 88 * Math.cos(rad);
              const y2 = 110 + 88 * Math.sin(rad);
              return (
                <line
                  key={tick}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={pct >= tick ? phase.ring : "#27272A"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={{ transition: "stroke 0.8s ease" }}
                />
              );
            })}
          </svg>

          {/* Main ring */}
          <svg width="220" height="220" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
            <circle
              className="ring-track"
              cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke="#18181B"
              strokeWidth={STROKE}
            />
            <circle
              className="ring-progress"
              cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke={phase.ring}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{
                filter: `drop-shadow(0 0 6px ${phase.ring}40)`,
              }}
            />
          </svg>

          {/* Center content */}
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 52,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: "#FAFAFA",
            }}>
              {displayPct}
              <span style={{ fontSize: 20, color: "#52525B", fontWeight: 400, marginLeft: 2 }}>%</span>
            </div>
            <div style={{
              fontSize: 12,
              color: "#71717A",
              marginTop: 6,
              fontWeight: 400,
            }}>
              {formatTime(now)}
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: phase.ring,
            animation: "pulseGlow 2s ease-in-out infinite",
            boxShadow: `0 0 8px ${phase.ring}60`,
            transition: "background-color 0.8s ease, box-shadow 0.8s ease",
          }} />
          <span className="phase-label" style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: phase.ring,
            transition: "color 0.8s ease",
          }}>
            {phase.label}
          </span>
          <span style={{ fontSize: 11, color: "#3F3F46", margin: "0 4px" }}>·</span>
          <span style={{ fontSize: 11, color: "#52525B", fontWeight: 400 }}>
            {minsLeft}m left
          </span>
        </div>

        {/* Progress segments */}
        <div style={{
          display: "flex",
          gap: 3,
          marginTop: 4,
        }}>
          {[0, 25, 50, 75].map((seg) => (
            <div key={seg} style={{
              width: 40,
              height: 3,
              borderRadius: 2,
              backgroundColor: pct >= seg + 25 ? phase.ring : pct >= seg ? `${phase.ring}60` : "#1C1C1E",
              transition: "background-color 0.8s ease",
            }} />
          ))}
        </div>

        {/* Info toggle */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            marginTop: 8,
            background: "none",
            border: "1px solid #27272A",
            borderRadius: 6,
            padding: "6px 14px",
            color: "#52525B",
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.1em",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = "#3F3F46";
            e.target.style.color = "#71717A";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#27272A";
            e.target.style.color = "#52525B";
          }}
        >
          {showInfo ? "hide" : "why 100?"}
        </button>

        {showInfo && (
          <div style={{
            maxWidth: 280,
            textAlign: "center",
            animation: "fadeIn 0.4s ease-out",
            padding: "16px 20px",
            borderRadius: 10,
            border: "1px solid #1C1C1E",
            backgroundColor: "#0F0F10",
          }}>
            <p style={{
              fontSize: 12,
              lineHeight: 1.7,
              color: "#A1A1AA",
              margin: 0,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 400,
            }}>
              Your brain thinks in percentages, not sixths.
              When a clock says <span style={{ color: "#FAFAFA" }}>:30</span>, it
              doesn't <em>feel</em> like half. But <span style={{ color: "#FAFAFA" }}>50%</span> does.
              <br /><br />
              This is time in a language your mind already speaks.
            </p>
          </div>
        )}
      </div>

      {/* Bottom signature */}
      <div style={{
        position: "absolute",
        bottom: 20,
        fontSize: 9,
        color: "#27272A",
        letterSpacing: "0.15em",
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        DESIGNED FOR ADHD BRAINS
      </div>
    </div>
  );
}
