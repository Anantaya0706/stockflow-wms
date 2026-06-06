/* ===================================================================
   StockFlow WMS — shared store (React context)
   Supabase mode: ดึง warehouses, products, stock, movements จาก DB
   Offline mode:  localStorage (fallback เมื่อไม่ได้ set credentials)
   =================================================================== */
const { createContext, useContext, useReducer, useCallback, useEffect, useRef } = React;

const WMSStore = createContext(null);
const useWMS = () => useContext(WMSStore);
const LS_KEY = "stockflow_wms_v3";

/* ── Map Supabase rows → window.WMS shape ── */
function mapProduct(p) {
  return {
    id: p.id, sku: p.sku || p.id,
    name: p.name || "", nameTh: p.name_th || p.name || "",
    brand: p.brand || p.category || "",
    brandTh: p.brand_th || p.category_th || p.brand || "",
    size: p.size || "", sizeTh: p.size_th || "", weight: p.weight_range || "",
    form: p.form || "", formTh: p.form_th || "",
    count: p.pieces_per_ctn || 1, uomPcs: p.pieces_per_ctn || 1,
    uom: p.uom || "Unit",
    ean: p.ean || "",
    cost: +(p.cost || 0), price: +(p.price || 0),
    reorder: p.reorder_point || 0,
    category: p.category || "", categoryTh: p.category_th || "",
    shelfLife: p.shelf_life || "", origin: p.origin || "",
  };
}

function mapWarehouse(w) {
  return {
    id: w.id, code: w.code,
    name: w.name, nameTh: w.name_th,
    city: w.city, cityTh: w.city_th,
    region: w.region, cap: w.capacity || 0,
  };
}

function overrideWMS(products, warehouses) {
  window.WMS.products  = products;
  window.WMS.warehouses = warehouses;
  window.WMS.prodById  = Object.fromEntries(products.map(p => [p.id, p]));
  window.WMS.whById    = Object.fromEntries(warehouses.map(w => [w.id, w]));
}

/* ── Offline helpers ── */
function cloneStock(s) { const o = {}; for (const k in s) o[k] = { ...s[k] }; return o; }

function initOfflineState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const p = JSON.parse(raw); if (p?.stock && p?.movements) return p; }
  } catch (e) {}
  return { stock: cloneStock(window.WMS.stock), movements: window.WMS.movements.slice(), loading: false };
}

let _seq = 4900;
function nextRef(prefix) { return `${prefix}-26${String(_seq++).padStart(5, "0")}`; }

function reducer(state, action) {
  switch (action.type) {
    case "SET_LOADING": return { ...state, loading: action.value };
    case "HYDRATE":     return { ...state, ...action.data, loading: false };
    case "POST": {
      const stock = cloneStock(state.stock);
      const ts = new Date().toISOString();
      const { kind, lines, fromWh, toWh, partner, reason, docRef, operator } = action.payload;
      const pref = window.WMS.refTypes[kind].prefix;
      const newMoves = lines.map((ln) => {
        const ref = nextRef(pref);
        if (kind === "INBOUND")  stock[ln.productId][toWh]   = (stock[ln.productId][toWh]   || 0) + ln.qty;
        if (kind === "OUTBOUND") stock[ln.productId][fromWh] = (stock[ln.productId][fromWh] || 0) - ln.qty;
        if (kind === "TRANSFER") { stock[ln.productId][fromWh] = (stock[ln.productId][fromWh] || 0) - ln.qty;
                                   stock[ln.productId][toWh]   = (stock[ln.productId][toWh]   || 0) + ln.qty; }
        if (kind === "DAMAGE")   stock[ln.productId][fromWh] = (stock[ln.productId][fromWh] || 0) - ln.qty;
        return { id: ref, type: kind, productId: ln.productId, qty: ln.qty, ts,
          operator: operator || "Admin", status: "Posted",
          fromWh: kind === "INBOUND"  ? undefined : fromWh,
          toWh:   kind === "OUTBOUND" ? undefined : toWh,
          partner: partner || undefined, reason: reason || undefined,
          docRef: docRef || undefined, fresh: true };
      });
      return { ...state, stock, movements: [...newMoves, ...state.movements] };
    }
    case "ADD_PRODUCT_OFFLINE": {
      /* เพิ่ม stock key ว่าง ๆ สำหรับสินค้าใหม่ */
      const stock = cloneStock(state.stock);
      stock[action.product.id] = {};
      return { ...state, stock };
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

  const [state, dispatch] = useReducer(reducer, undefined, initOfflineState);
  const [toasts, setToasts] = React.useState([]);
  const [products, setProducts] = React.useState(window.WMS.products.slice());
  const [warehouses, setWarehouses] = React.useState(window.WMS.warehouses.slice());
  const toastId = useRef(0);

  /* ── Supabase: hydrate ── */
  useEffect(() => {
    if (!useSupa) return;
    dispatch({ type: "SET_LOADING", value: true });
    Promise.all([
      window.SBAPI.getStock(),
      window.SBAPI.getMovements(),
      window.SBAPI.getProducts(),
      window.SBAPI.getWarehouses(),
    ]).then(([stock, movements, dbProducts, dbWarehouses]) => {
      const mp = dbProducts.map(mapProduct);
      const mw = dbWarehouses.map(mapWarehouse);
      overrideWMS(mp, mw);
      setProducts(mp);
      setWarehouses(mw);
      dispatch({ type: "HYDRATE", data: { stock, movements } });
    }).catch(err => {
      console.error("Supabase hydration failed, using seed data", err);
      dispatch({ type: "SET_LOADING", value: false });
    });
  }, []);

  /* ── Offline: localStorage ── */
  useEffect(() => {
    if (useSupa) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state]);

  const pushToast = useCallback((t) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4200);
  }, []);

  /* ── post transaction ── */
  const post = useCallback(async (payload) => {
    if (useSupa) {
      try {
        await window.SBAPI.postTransaction(payload);
        const [stock, movements] = await Promise.all([
          window.SBAPI.getStock(), window.SBAPI.getMovements(),
        ]);
        dispatch({ type: "HYDRATE", data: { stock, movements } });
      } catch (err) {
        pushToast({ kind: "DAMAGE", icon: "damage", title: "Error", msg: err.message });
        throw err;
      }
    } else {
      dispatch({ type: "POST", payload });
    }
  }, [useSupa]);

  /* ── เพิ่มสินค้าใหม่ ── */
  const addProduct = useCallback(async (formData) => {
    const sku = formData.sku.trim().toUpperCase();
    const newProd = {
      id: sku, sku,
      name:      formData.nameEn  || formData.nameTh || sku,
      nameTh:    formData.nameTh  || formData.nameEn || sku,
      brand:     formData.brand   || "",
      brandTh:   formData.brand   || "",
      size:      formData.size    || "",
      sizeTh:    formData.size    || "",
      weight:    "",
      form:      formData.category || "",
      formTh:    formData.category || "",
      count:     parseInt(formData.piecesPerCtn) || 1,
      uomPcs:    parseInt(formData.piecesPerCtn) || 1,
      uom:       formData.uom     || "Unit",
      ean:       formData.ean     || "",
      cost:      parseFloat(formData.cost)  || 0,
      price:     parseFloat(formData.price) || 0,
      reorder:   parseInt(formData.reorder) || 0,
      category:  formData.category || "",
      categoryTh: formData.category || "",
      shelfLife: "", origin: "",
    };
    if (useSupa) {
      const dbRow = {
        id: sku, sku,
        name: newProd.name, name_th: newProd.nameTh,
        brand: newProd.brand, brand_th: newProd.brand,
        size: newProd.size, size_th: newProd.size,
        form: newProd.form, form_th: newProd.form,
        pieces_per_ctn: newProd.count,
        uom: newProd.uom, ean: newProd.ean || null,
        cost: newProd.cost, price: newProd.price,
        reorder_point: newProd.reorder,
        category: newProd.category, category_th: newProd.categoryTh,
      };
      await window.SBAPI.saveProduct(dbRow);
      const dbProducts = await window.SBAPI.getProducts();
      const mp = dbProducts.map(mapProduct);
      overrideWMS(mp, warehouses);
      setProducts(mp);
    } else {
      /* offline: ใส่เข้า window.WMS และ state */
      const mp = [...products, newProd];
      overrideWMS(mp, warehouses);
      /* เพิ่ม stock row ว่าง ๆ ให้ทุกคลัง */
      dispatch({ type: "ADD_PRODUCT_OFFLINE", product: newProd });
      setProducts(mp);
    }
  }, [useSupa, warehouses, products]);

  /* ── ลบสินค้า ── */
  const deleteProduct = useCallback(async (id) => {
    if (useSupa) {
      await window.SBAPI.deleteProduct(id);
      const mp = products.filter(p => p.id !== id);
      overrideWMS(mp, warehouses);
      setProducts(mp);
    }
  }, [useSupa, products, warehouses]);

  /* ── reset ── */
  const reset = useCallback(async () => {
    if (useSupa) {
      dispatch({ type: "SET_LOADING", value: true });
      const [stock, movements] = await Promise.all([
        window.SBAPI.getStock(), window.SBAPI.getMovements(),
      ]);
      dispatch({ type: "HYDRATE", data: { stock, movements } });
    } else {
      dispatch({ type: "RESET" });
    }
  }, [useSupa]);

  /* ── selectors ── */
  const selectors = {
    totalForProduct:  (pid) => Object.values(state.stock[pid] || {}).reduce((a, b) => a + b, 0),
    totalForWarehouse:(wid) => products.reduce((a, p) => a + (state.stock[p.id]?.[wid] || 0), 0),
    grandTotal:       ()    => products.reduce((a, p) =>
      a + Object.values(state.stock[p.id] || {}).reduce((x, y) => x + y, 0), 0),
    lowStock: () => {
      const out = [];
      products.forEach(p => {
        const total = Object.values(state.stock[p.id] || {}).reduce((a, b) => a + b, 0);
        if (total <= p.reorder) out.push({ product: p, total, ratio: total / (p.reorder || 1) });
      });
      return out.sort((a, b) => a.ratio - b.ratio);
    },
    stockAt: (pid, wid) => state.stock[pid]?.[wid] || 0,
  };

  return React.createElement(WMSStore.Provider, {
    value: { state, post, reset, pushToast, toasts, selectors, useSupa,
             products, warehouses, addProduct, deleteProduct },
  }, children);
}

Object.assign(window, { WMSProvider, useWMS });
