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
  // Night from 5pm to 6am. Day arc spans 6a→8p (sun); night arc spans 8p→6a
  // (moon rises on the left at 8pm, sets on the right at 6am = sunrise).
  const dark = h >= 17 || h < 6;
  const START = dark ? 20 : DAY_START;   // night starts 20:00
  const END = dark ? 30 : DAY_END;       // night ends 06:00 (= 30 on a 24h+ scale)
  const hh = dark && h < 6 ? h + 24 : h; // wrap post-midnight hours onto the night scale
  const f = Math.max(0, Math.min(1, (hh - START) / (END - START)));
  const orb = pointAt(f);
  const showOrb = dark || (h >= DAY_START && h <= DAY_END);

  const fmtHour = (hr: number) => {
    const x = ((Math.round(hr) % 24) + 24) % 24;
    if (x === 0) return '12a';
    if (x === 12) return '12p';
    return x < 12 ? `${x}a` : `${x - 12}p`;
  };

  // hour ticks + labels, and shorter half-hour ticks (radial to the dome)
  const hours: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const halves: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const labels: { x: number; y: number; t: string }[] = [];
  for (let m = START * 2; m <= END * 2; m++) {
    const hr = m / 2;
    const f2 = (hr - START) / (END - START);
    const p = pointAt(f2);
    const rad = ((90 + HALF) - f2 * SPAN) * Math.PI / 180;
    const nx = Math.cos(rad), ny = -Math.sin(rad); // outward normal
    const onHour = m % 2 === 0;
    const len = onHour ? 7 : 3;
    const seg = { x1: p.x - nx * len / 2, y1: p.y - ny * len / 2, x2: p.x + nx * len / 2, y2: p.y + ny * len / 2 };
    if (onHour) {
      hours.push(seg);
      const lp = { x: p.x + nx * 18, y: p.y + ny * 18 };
      labels.push({ x: lp.x, y: lp.y, t: fmtHour(hr) });
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
      {showOrb && <div className={`wk-sun-orb ${dark ? 'moon' : ''}`} style={pct(orb.x, orb.y)} />}
      <div className="wk-sun-now">
        <div className="wk-sun-time">{clock}</div>
        <div className="wk-sun-tip">{tipFor(now.getHours())}</div>
      </div>
    </div>
  );
}
