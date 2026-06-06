/* ===================================================================
   StockFlow WMS — shared store (React context)
   โหมด Supabase: ดึงข้อมูลจาก DB จริง, โพสต์ผ่าน RPC
   โหมด Offline:  ใช้ localStorage เหมือนเดิม (fallback)
   =================================================================== */
const { createContext, useContext, useReducer, useCallback, useEffect, useRef } = React;

const WMSStore = createContext(null);
const useWMS = () => useContext(WMSStore);
const LS_KEY = "stockflow_wms_v3";

function cloneStock(s) {
  const o = {};
  for (const k in s) o[k] = { ...s[k] };
  return o;
}

/* ── Offline init (localStorage / seed) ── */
function initOfflineState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.stock && p.movements) return p;
    }
  } catch (e) {}
  return {
    stock: cloneStock(window.WMS.stock),
    movements: window.WMS.movements.slice(),
    loading: false,
  };
}

let _seq = 4900;
function nextRef(prefix) { return `${prefix}-26${String(_seq++).padStart(5, "0")}`; }

/* ── Offline reducer (unchanged logic) ── */
function offlineReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING": return { ...state, loading: action.value };
    case "HYDRATE":     return { ...state, ...action.data, loading: false };
    case "POST": {
      const stock = cloneStock(state.stock);
      const newMoves = [];
      const ts = new Date().toISOString();
      const { kind, lines, fromWh, toWh, partner, reason, docRef, operator } = action.payload;
      const pref = window.WMS.refTypes[kind].prefix;
      lines.forEach((ln) => {
        const ref = nextRef(pref);
        if (kind === "INBOUND")  { stock[ln.productId][toWh]   = (stock[ln.productId][toWh]   || 0) + ln.qty; }
        if (kind === "OUTBOUND") { stock[ln.productId][fromWh] = (stock[ln.productId][fromWh] || 0) - ln.qty; }
        if (kind === "TRANSFER") { stock[ln.productId][fromWh] = (stock[ln.productId][fromWh] || 0) - ln.qty;
                                   stock[ln.productId][toWh]   = (stock[ln.productId][toWh]   || 0) + ln.qty; }
        if (kind === "DAMAGE")   { stock[ln.productId][fromWh] = (stock[ln.productId][fromWh] || 0) - ln.qty; }
        newMoves.push({
          id: ref, type: kind, productId: ln.productId, qty: ln.qty,
          ts, operator: operator || "You (admin)", status: "Posted",
          fromWh: kind === "INBOUND"  ? undefined : fromWh,
          toWh:   kind === "OUTBOUND" ? undefined : toWh,
          partner: partner || undefined,
          reason:  reason  || undefined,
          docRef:  docRef  || undefined,
          fresh: true,
        });
      });
      return { ...state, stock, movements: [...newMoves, ...state.movements] };
    }
    case "RESET": {
      localStorage.removeItem(LS_KEY);
      return { stock: cloneStock(window.WMS.stock), movements: window.WMS.movements.slice(), loading: false };
    }
    default: return state;
  }
}

/* ══════════════════════════════════════════════════════════════════
   WMSProvider
   ══════════════════════════════════════════════════════════════════ */
function WMSProvider({ children }) {
  const useSupa = window.WMS_USE_SUPABASE === true;

  const [state, dispatch] = useReducer(offlineReducer, undefined, initOfflineState);
  const [toasts, setToasts] = React.useState([]);
  const toastId = useRef(0);

  /* ── Supabase: hydrate on mount ── */
  useEffect(() => {
    if (!useSupa) return;
    dispatch({ type: "SET_LOADING", value: true });
    Promise.all([window.SBAPI.getStock(), window.SBAPI.getMovements()])
      .then(([stock, movements]) => {
        dispatch({ type: "HYDRATE", data: { stock, movements } });
      })
      .catch((err) => {
        console.error("Supabase hydration failed, falling back to seed data", err);
        dispatch({ type: "SET_LOADING", value: false });
      });
  }, []);

  /* ── Offline: persist to localStorage ── */
  useEffect(() => {
    if (useSupa) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state]);

  const pushToast = useCallback((t) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  /* ── post: Supabase RPC or offline reducer ── */
  const post = useCallback(async (payload) => {
    if (useSupa) {
      try {
        /* 1. โพสต์ไป Supabase (atomic stock update + movement insert) */
        await window.SBAPI.postTransaction(payload);
        /* 2. reload stock + movements จาก DB */
        const [stock, movements] = await Promise.all([
          window.SBAPI.getStock(),
          window.SBAPI.getMovements(),
        ]);
        dispatch({ type: "HYDRATE", data: { stock, movements } });
      } catch (err) {
        pushToast({ kind: "DAMAGE", icon: "damage", title: "Error", msg: err.message });
        throw err;  // ให้ TransactionForm จับ error ต่อ
      }
    } else {
      dispatch({ type: "POST", payload });
    }
  }, [useSupa]);

  /* ── reset ── */
  const reset = useCallback(async () => {
    if (useSupa) {
      /* Supabase mode: reload fresh data (ไม่ลบ DB) */
      dispatch({ type: "SET_LOADING", value: true });
      const [stock, movements] = await Promise.all([
        window.SBAPI.getStock(),
        window.SBAPI.getMovements(),
      ]);
      dispatch({ type: "HYDRATE", data: { stock, movements } });
    } else {
      dispatch({ type: "RESET" });
    }
  }, [useSupa]);

  /* ── selectors (ทำงานกับ state.stock เหมือนเดิม) ── */
  const selectors = {
    totalForProduct:  (pid) => Object.values(state.stock[pid] || {}).reduce((a, b) => a + b, 0),
    totalForWarehouse:(wid) => window.WMS.products.reduce((a, p) => a + (state.stock[p.id]?.[wid] || 0), 0),
    grandTotal:       () =>    window.WMS.products.reduce((a, p) =>
                                 a + Object.values(state.stock[p.id] || {}).reduce((x, y) => x + y, 0), 0),
    lowStock: () => {
      const out = [];
      window.WMS.products.forEach((p) => {
        const total = Object.values(state.stock[p.id] || {}).reduce((a, b) => a + b, 0);
        if (total <= p.reorder) out.push({ product: p, total, ratio: total / p.reorder });
      });
      return out.sort((a, b) => a.ratio - b.ratio);
    },
    stockAt: (pid, wid) => state.stock[pid]?.[wid] || 0,
  };

  return React.createElement(WMSStore.Provider, {
    value: { state, post, reset, pushToast, toasts, selectors, useSupa },
  }, children);
}

Object.assign(window, { WMSProvider, useWMS });
