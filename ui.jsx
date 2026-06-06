/* ===================================================================
   StockFlow WMS — shared UI kit  (exported to window)
   =================================================================== */
const uState = React.useState, uEffect = React.useEffect, uRef = React.useRef;
Object.assign(window, { uState, uEffect, uRef });

/* ---------- icon set (standard line icons) ---------- */
const ICONS = {
  dash: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  balance: "M3 6h18M3 12h18M3 18h18",
  layers: "M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7L12 12l8.7-5M12 22V12",
  inbound: "M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  outbound: "M12 21V9m0 0l4 4m-4-4l-4 4M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2",
  transfer: "M4 7h16m0 0l-4-4m4 4l-4 4M20 17H4m0 0l4 4m-4-4l4-4",
  damage: "M10.3 3.2L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.2a2 2 0 00-3.4 0zM12 9v4M12 17h.01",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  plus: "M12 5v14M5 12h14",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6",
  chevR: "M9 18l6-6-6-6",
  chevD: "M6 9l6 6 6-6",
  chevL: "M15 18l-6-6 6-6",
  scan: "M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M3 12h18",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11zM12 17a4 4 0 100-8 4 4 0 000 8z",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  warehouse: "M22 8.4L12 3 2 8.4V21h20V8.4zM6 21v-7h12v7M6 17h12",
  pkg: "M16.5 9.4L7.5 4.2M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  filter: "M22 3H2l8 9.5V19l4 2v-8.5L22 3z",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  trend: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  dot: "M12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0",
  arrowR: "M5 12h14M12 5l7 7-7 7",
  refresh: "M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15",
  sparkle: "M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17l-1.9-5.1L4.5 10l5.6-1.4L12 3z",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  info: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  tag: "M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4a2 2 0 012-2h8a2 2 0 011.4.6l7.2 7.2a2 2 0 010 2.8zM7 7h.01",
};

function Icon({ name, size = 18, sw = 2, className = "", style }) {
  return React.createElement("svg", {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round",
    className, style,
  }, React.createElement("path", { d: ICONS[name] || ICONS.dot }));
}

/* ---------- animated number ---------- */
function CountUp({ value, dur = 700, format = (n) => Math.round(n).toLocaleString() }) {
  const [v, setV] = uState(value);
  const ref = uRef({ from: value, start: 0, mounted: false });
  uEffect(() => {
    // State is initialised to the real value, so paused-rAF / print / reduced-motion
    // views always show the number; rAF only enhances with a count animation.
    const from = ref.current.mounted ? v : value;
    ref.current.mounted = true;
    ref.current.start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - ref.current.start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (value - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setV(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return React.createElement("span", { className: "tnum" }, format(v));
}

/* ---------- badge for movement type ---------- */
function MoveBadge({ type, lang = "en" }) {
  const map = {
    INBOUND:  ["green", "inbound", "Receiving", "รับเข้า"],
    OUTBOUND: ["red", "outbound", "Shipping", "จัดส่ง"],
    TRANSFER: ["blue", "transfer", "Transfer", "โอนคลัง"],
    DAMAGE:   ["amber", "damage", "Damaged", "เสียหาย"],
  };
  const [cls, ico, en, th] = map[type] || map.INBOUND;
  return React.createElement("span", { className: `badge ${cls}` },
    React.createElement(Icon, { name: ico, size: 12, sw: 2.4 }),
    lang === "th" ? th : en);
}

/* ---------- KPI card ---------- */
function KPI({ icon, iconBg, iconColor, label, labelTh, value, unit, delta, deltaDir, foot, animate = true }) {
  return React.createElement("div", { className: "kpi" },
    React.createElement("div", { className: "kpi-top" },
      React.createElement("div", { className: "kpi-ico", style: { background: iconBg, color: iconColor } },
        React.createElement(Icon, { name: icon, size: 17, sw: 2.2 })),
      React.createElement("div", null,
        React.createElement("div", { className: "kpi-label" }, label),
        labelTh && React.createElement("div", { className: "kpi-label", style: { fontSize: 10.5, opacity: .8 } }, labelTh))
    ),
    React.createElement("div", null,
      React.createElement("span", { className: "kpi-value" },
        animate ? React.createElement(CountUp, { value }) : value),
      unit && React.createElement("span", { className: "kpi-unit" }, unit)),
    foot && React.createElement("div", { className: "kpi-foot" },
      delta != null && React.createElement("span", { className: `delta ${deltaDir}` },
        React.createElement(Icon, { name: deltaDir === "up" ? "trend" : "trend", size: 12, sw: 2.5,
          style: deltaDir === "down" ? { transform: "scaleY(-1)" } : null }),
        delta),
      React.createElement("span", null, foot))
  );
}

/* ---------- simple bar chart (horizontal) ---------- */
function BarRow({ label, sub, value, max, color = "var(--accent)", caption }) {
  const pct = max ? Math.max(2, (value / max) * 100) : 0;
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "7px 0" } },
    React.createElement("div", { style: { width: 150, flex: "none" } },
      React.createElement("div", { style: { fontSize: 12.5, fontWeight: 600, color: "var(--ink)" } }, label),
      sub && React.createElement("div", { style: { fontSize: 11, color: "var(--ink-3)" } }, sub)),
    React.createElement("div", { style: { flex: 1 } },
      React.createElement("div", { className: "bar-track" },
        React.createElement("div", { className: "bar-fill", style: { width: pct + "%", background: color } }))),
    React.createElement("div", { className: "mono", style: { width: 96, textAlign: "right", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" } }, caption)
  );
}

/* ---------- line/area chart (SVG) ---------- */
function AreaChart({ data, height = 150, keys = [{ k: "inb", color: "var(--accent)" }, { k: "out", color: "var(--neg)" }] }) {
  const W = 760, H = height, pad = { t: 12, r: 8, b: 22, l: 8 };
  const max = Math.max(...data.flatMap((d) => keys.map((k) => d[k.k]))) * 1.12;
  const x = (i) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = (k) => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(" ");
  const area = (k) => `${line(k)} L${x(data.length - 1)} ${H - pad.b} L${x(0)} ${H - pad.b} Z`;
  return React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", height: H, display: "block" } },
    React.createElement("defs", null,
      keys.map((k, i) => React.createElement("linearGradient", { key: i, id: `g${i}`, x1: 0, y1: 0, x2: 0, y2: 1 },
        React.createElement("stop", { offset: "0%", stopColor: k.color, stopOpacity: 0.18 }),
        React.createElement("stop", { offset: "100%", stopColor: k.color, stopOpacity: 0 })))),
    [0.25, 0.5, 0.75].map((g, i) => React.createElement("line", { key: i, x1: pad.l, x2: W - pad.r, y1: pad.t + g * (H - pad.t - pad.b), y2: pad.t + g * (H - pad.t - pad.b), stroke: "var(--line)", strokeWidth: 1 })),
    keys.map((k, i) => React.createElement("g", { key: i },
      React.createElement("path", { d: area(k.k), fill: `url(#g${i})` }),
      React.createElement("path", { d: line(k.k), fill: "none", stroke: k.color, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" }),
      React.createElement("circle", { cx: x(data.length - 1), cy: y(data[data.length - 1][k.k]), r: 3.5, fill: k.color, stroke: "#fff", strokeWidth: 2 }))),
    data.map((d, i) => i % 2 === 0 && React.createElement("text", { key: i, x: x(i), y: H - 6, fontSize: 9.5, fill: "var(--ink-soft)", textAnchor: "middle", fontFamily: "var(--mono)" }, d.date.slice(8)))
  );
}

/* ---------- donut ---------- */
function Donut({ segments, size = 132, thickness = 18, center }) {
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  let off = 0;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return React.createElement("div", { style: { position: "relative", width: size, height: size } },
    React.createElement("svg", { width: size, height: size, style: { transform: "rotate(-90deg)" } },
      React.createElement("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: "var(--surface-3)", strokeWidth: thickness }),
      segments.map((s, i) => {
        const len = (s.value / total) * c;
        const el = React.createElement("circle", { key: i, cx: size / 2, cy: size / 2, r, fill: "none", stroke: s.color, strokeWidth: thickness, strokeDasharray: `${len} ${c - len}`, strokeDashoffset: -off, strokeLinecap: "butt", style: { transition: "stroke-dasharray .8s ease" } });
        off += len; return el;
      })),
    center && React.createElement("div", { style: { position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" } }, center)
  );
}

/* ---------- toasts host ---------- */
function ToastHost() {
  const { toasts } = useWMS();
  const styleMap = {
    INBOUND: ["green", "inbound", "var(--pos-bg)", "var(--pos)"],
    OUTBOUND: ["red", "outbound", "var(--neg-bg)", "var(--neg)"],
    TRANSFER: ["blue", "transfer", "var(--move-bg)", "var(--move)"],
    DAMAGE: ["amber", "damage", "var(--warn-bg)", "oklch(0.6 0.14 70)"],
    INFO: ["gray", "check", "var(--accent-soft)", "var(--accent)"],
  };
  return React.createElement("div", { className: "toasts" },
    toasts.map((t) => {
      const [, ico, bg, col] = styleMap[t.kind || "INFO"] || styleMap.INFO;
      return React.createElement("div", { className: "toast", key: t.id },
        React.createElement("div", { className: "toast-ico", style: { background: bg, color: col } },
          React.createElement(Icon, { name: t.icon || ico, size: 16, sw: 2.4 })),
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("div", { className: "toast-title" }, t.title),
          t.msg && React.createElement("div", { className: "toast-msg" }, t.msg)));
    })
  );
}

/* ---------- modal / drawer shells ---------- */
function Drawer({ title, sub, onClose, children, foot, width }) {
  uEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  return React.createElement("div", { className: "overlay", onMouseDown: onClose },
    React.createElement("div", { className: "drawer", style: width ? { width } : null, onMouseDown: (e) => e.stopPropagation() },
      React.createElement("div", { className: "drawer-head" },
        React.createElement("div", null,
          React.createElement("h3", { style: { fontSize: 16 } }, title),
          sub && React.createElement("div", { style: { fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 } }, sub)),
        React.createElement("button", { className: "x-btn", onClick: onClose }, React.createElement(Icon, { name: "x", size: 18 }))),
      React.createElement("div", { className: "drawer-body" }, children),
      foot && React.createElement("div", { className: "drawer-foot" }, foot))
  );
}

function Modal({ title, onClose, children, foot, width }) {
  return React.createElement("div", { className: "overlay", onMouseDown: onClose },
    React.createElement("div", { className: "modal", style: width ? { width } : null, onMouseDown: (e) => e.stopPropagation() },
      React.createElement("div", { className: "modal-head" },
        React.createElement("h3", { style: { fontSize: 16 } }, title),
        React.createElement("button", { className: "x-btn", onClick: onClose }, React.createElement(Icon, { name: "x", size: 18 }))),
      React.createElement("div", { className: "modal-body" }, children),
      foot && React.createElement("div", { className: "modal-foot" }, foot))
  );
}

/* ---------- product thumbnail placeholder ---------- */
function ProductThumb({ product, size = 40 }) {
  const hue = { BabySoft: 200, DryNight: 250, PureCare: 155, CloudBaby: 220, LittleStep: 30, NanoDry: 285 }[product.brand] || 200;
  return React.createElement("div", {
    style: {
      width: size, height: size, borderRadius: 8, flex: "none", display: "grid", placeItems: "center",
      background: `oklch(0.95 0.04 ${hue})`, color: `oklch(0.5 0.12 ${hue})`,
      fontFamily: "var(--mono)", fontWeight: 600, fontSize: size * 0.32, border: "1px solid var(--line)",
    },
  }, product.size);
}

Object.assign(window, { Icon, CountUp, MoveBadge, KPI, BarRow, AreaChart, Donut, ToastHost, Drawer, Modal, ProductThumb, timeAgo });

/* ---------- util: relative time ---------- */
function timeAgo(iso) {
  const diff = (new Date("2026-06-06T09:35:00") - new Date(iso)) / 60000;
  if (diff < 1) return "just now";
  if (diff < 60) return `${Math.round(diff)}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}
