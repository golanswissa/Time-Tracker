import { useEffect, useState } from 'react';

// Ambient "sky dome": a faint arc across the screen with the sun riding along it
// by local time. Daytime window is fixed (no geolocation prompt).
const DAY_START = 6;   // 06:00 → left horizon
const DAY_END = 20;    // 20:00 → right horizon
// A shallow ~120° arc (a third of a circle) so the apex sits low, not at the top.
const VB_W = 1000, VB_H = 520, CX = 500, CY = 700, R = 560;
const SPAN = 120, HALF = SPAN / 2;

/** Fraction 0..1 across the day → point on the dome (viewBox coords). */
function pointAt(f: number) {
  const rad = ((90 + HALF) - f * SPAN) * Math.PI / 180; // 150°(left) → 30°(right)
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) };
}
const pct = (x: number, y: number) => ({ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%` });

function tipFor(h: number): string {
  if (h < 6) return 'Rest up';
  if (h < 8) return 'Morning — ease in';
  if (h < 10) return 'Deep work time';
  if (h < 11) return 'Stand up & stretch';
  if (h < 12) return 'Drink some water';
  if (h < 14) return 'Time for lunch';
  if (h < 15) return 'Grab a coffee';
  if (h < 16) return 'Stand up & stretch';
  if (h < 17) return 'Drink some water';
  if (h < 19) return 'Wrapping up';
  if (h < 22) return 'Wind down';
  return 'Rest up';
}

export function SunArc() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours() + now.getMinutes() / 60;
  const f = Math.max(0, Math.min(1, (h - DAY_START) / (DAY_END - DAY_START)));
  const sun = pointAt(f);
  const belowHorizon = h < DAY_START || h > DAY_END;

  // hour ticks + labels, and shorter half-hour ticks (radial to the dome)
  const hours: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const halves: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const labels: { x: number; y: number; t: string }[] = [];
  for (let m = DAY_START * 2; m <= DAY_END * 2; m++) {
    const hr = m / 2;
    const f2 = (hr - DAY_START) / (DAY_END - DAY_START);
    const p = pointAt(f2);
    const rad = ((90 + HALF) - f2 * SPAN) * Math.PI / 180;
    const nx = Math.cos(rad), ny = -Math.sin(rad); // outward normal
    const onHour = m % 2 === 0;
    const len = onHour ? 7 : 3;
    const seg = { x1: p.x - nx * len / 2, y1: p.y - ny * len / 2, x2: p.x + nx * len / 2, y2: p.y + ny * len / 2 };
    if (onHour) {
      hours.push(seg);
      const lp = { x: p.x + nx * 18, y: p.y + ny * 18 };
      const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
      labels.push({ x: lp.x, y: lp.y, t: `${hr12}${hr < 12 ? 'a' : 'p'}` });
    } else {
      halves.push(seg);
    }
  }

  const a0 = pointAt(0), a1 = pointAt(1);
  const arcPath = `M ${a0.x} ${a0.y} A ${R} ${R} 0 0 1 ${a1.x} ${a1.y}`;
  const clock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="wk-sun" aria-hidden="true">
      <svg className="wk-sun-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        <path d={arcPath} className="wk-sun-arc" vectorEffect="non-scaling-stroke" />
        {halves.map((t, i) => <line key={`h${i}`} {...t} className="wk-sun-tick min" vectorEffect="non-scaling-stroke" />)}
        {hours.map((t, i) => <line key={`o${i}`} {...t} className="wk-sun-tick" vectorEffect="non-scaling-stroke" />)}
      </svg>
      {labels.map((l, i) => <span key={i} className="wk-sun-lab" style={pct(l.x, l.y)}>{l.t}</span>)}
      {!belowHorizon && <div className="wk-sun-orb" style={pct(sun.x, sun.y)} />}
      <div className="wk-sun-now">
        <div className="wk-sun-time">{clock}</div>
        <div className="wk-sun-tip">{tipFor(now.getHours())}</div>
      </div>
    </div>
  );
}
