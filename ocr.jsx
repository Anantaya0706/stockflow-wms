/* ===================================================================
   StockFlow WMS — OCR product scanner
   Upload image → animated scan → fields auto-fill (simulated extraction)
   =================================================================== */
function OCRScanner({ lang, onClose }) {
  const { pushToast } = useWMS();
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);
  const [phase, setPhase] = uState("idle"); // idle | scanning | review
  const [img, setImg] = uState(null);
  const [drag, setDrag] = uState(false);
  const [progress, setProgress] = uState(0);
  const [data, setData] = uState(null);
  const [shown, setShown] = uState(0); // how many fields revealed
  const fileRef = uRef(null);

  const startScan = (src) => {
    setImg(src);
    setPhase("scanning");
    setProgress(0);
    setShown(0);
    const sample = W.ocrSamples[Math.floor(Math.random() * W.ocrSamples.length)];
    let pr = 0;
    const iv = setInterval(() => {
      pr += Math.random() * 14 + 6;
      if (pr >= 100) { pr = 100; clearInterval(iv); setData(sample); setTimeout(() => setPhase("review"), 350); }
      setProgress(pr);
    }, 220);
  };

  uEffect(() => {
    if (phase !== "review") return;
    const fields = 8;
    let i = 0;
    const iv = setInterval(() => { i++; setShown(i); if (i >= fields) clearInterval(iv); }, 160);
    return () => clearInterval(iv);
  }, [phase]);

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => startScan(e.target.result);
    reader.readAsDataURL(file);
  };

  const useSample = () => startScan("SAMPLE");

  const reset = () => { setPhase("idle"); setImg(null); setData(null); setProgress(0); setShown(0); };

  const create = () => {
    pushToast({ kind: "INFO", icon: "sparkle", title: T("Product created from scan", "สร้างสินค้าจากการสแกนแล้ว"),
      msg: `${data.brand} ${data.form} ${data.size} · ${data.ean}` });
    onClose();
  };

  // ---- extracted fields config ----
  const fields = data ? [
    { en: "Brand", th: "แบรนด์", val: lang === "th" ? data.brandTh : data.brand, conf: 0.98 },
    { en: "Category", th: "หมวดหมู่", val: T("Baby Diapers", "ผ้าอ้อมเด็ก"), conf: 0.99 },
    { en: "Diaper type", th: "ชนิด", val: lang === "th" ? data.formTh : data.form, conf: 0.95 },
    { en: "Size", th: "ไซส์", val: data.size + " (" + data.weight + ")", conf: 0.93 },
    { en: "Pieces / pack", th: "จำนวนต่อแพ็ค", val: data.count + " " + T("pcs", "ชิ้น"), conf: 0.9 },
    { en: "Barcode (EAN)", th: "บาร์โค้ด", val: data.ean, conf: 0.99 },
    { en: "Country of origin", th: "ประเทศต้นทาง", val: data.origin, conf: 0.88 },
    { en: "Suggested SKU", th: "รหัส SKU แนะนำ", val: `DP-${data.brand.replace(/[a-z]/g,"").slice(0,2).toUpperCase()}-${data.size}-${data.count}`, conf: 0.91 },
  ] : [];

  const foot = phase === "review"
    ? React.createElement(React.Fragment, null,
        React.createElement("button", { className: "btn", onClick: reset }, React.createElement(Icon, { name: "refresh", size: 15 }), T("Re-scan", "สแกนใหม่")),
        React.createElement("div", { style: { flex: 1 } }),
        React.createElement("button", { className: "btn primary", onClick: create }, React.createElement(Icon, { name: "check", size: 16 }), T("Create product", "สร้างสินค้า")))
    : null;

  return React.createElement(Drawer, { title: T("Scan Product (OCR)", "สแกนสินค้า (OCR)"), sub: T("Auto-extract master data from a product photo", "ดึงข้อมูลสินค้าจากรูปภาพอัตโนมัติ"), onClose, foot, width: 600 },
    // ---- idle: dropzone ----
    phase === "idle" && React.createElement("div", null,
      React.createElement("div", { className: "dropzone" + (drag ? " drag" : ""),
        onClick: () => fileRef.current.click(),
        onDragOver: (e) => { e.preventDefault(); setDrag(true); },
        onDragLeave: () => setDrag(false),
        onDrop: (e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); } },
        React.createElement("div", { style: { width: 56, height: 56, borderRadius: 15, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", margin: "0 auto 14px" } },
          React.createElement(Icon, { name: "camera", size: 28, sw: 1.9 })),
        React.createElement("div", { style: { fontWeight: 600, fontSize: 15 } }, T("Drop a product photo here", "วางรูปสินค้าที่นี่")),
        React.createElement("div", { style: { color: "var(--ink-3)", fontSize: 13, margin: "5px 0 16px" } }, T("or click to browse · JPG, PNG, HEIC", "หรือคลิกเพื่อเลือกไฟล์ · JPG, PNG, HEIC")),
        React.createElement("div", { className: "btn primary sm", style: { display: "inline-flex" } }, React.createElement(Icon, { name: "upload", size: 15 }), T("Choose image", "เลือกรูปภาพ")),
        React.createElement("input", { ref: fileRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: (e) => onFile(e.target.files[0]) })),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, margin: "18px 0", color: "var(--ink-soft)", fontSize: 12 } },
        React.createElement("div", { style: { flex: 1, height: 1, background: "var(--line)" } }), T("no photo handy?", "ไม่มีรูป?"), React.createElement("div", { style: { flex: 1, height: 1, background: "var(--line)" } })),
      React.createElement("button", { className: "btn", style: { width: "100%" }, onClick: useSample },
        React.createElement(Icon, { name: "sparkle", size: 15 }), T("Try with a sample diaper pack", "ลองด้วยตัวอย่างผ้าอ้อม")),
      React.createElement("div", { style: { marginTop: 22, padding: "14px 16px", background: "var(--surface-2)", borderRadius: 10, fontSize: 12.5, color: "var(--ink-2)", display: "flex", gap: 10 } },
        React.createElement(Icon, { name: "info", size: 16, style: { color: "var(--accent)", flex: "none", marginTop: 1 } }),
        React.createElement("div", null, React.createElement("b", null, T("How it works: ", "วิธีใช้งาน: ")),
          T("our recognition model reads the brand, size, pack count, and barcode straight off the packaging — no manual typing.", "ระบบจะอ่านแบรนด์ ไซส์ จำนวน และบาร์โค้ดจากบรรจุภัณฑ์โดยอัตโนมัติ")))
    ),

    // ---- scanning ----
    (phase === "scanning" || phase === "review") && React.createElement("div", null,
      React.createElement("div", { className: "scan-stage", style: { aspectRatio: "16/10", marginBottom: 16 } },
        img === "SAMPLE"
          ? React.createElement("div", { className: "swatch-stripes", style: { position: "absolute", inset: 0, display: "grid", placeItems: "center" } },
              React.createElement("div", { style: { textAlign: "center", color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 } },
                React.createElement(Icon, { name: "pkg", size: 34, style: { marginBottom: 8 } }),
                React.createElement("div", null, "SAMPLE DIAPER PACK")))
          : React.createElement("img", { src: img, style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } }),
        React.createElement("div", { className: "scan-grid" }),
        ["tl", "tr", "bl", "br"].map((c) => React.createElement("div", { key: c, className: "scan-corner " + c })),
        phase === "scanning" && React.createElement("div", { className: "scan-line" }),
        phase === "scanning" && React.createElement("div", { style: { position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 14px", background: "linear-gradient(transparent, oklch(0.2 0.02 160 / 0.7))", color: "#fff", display: "flex", alignItems: "center", gap: 8 } },
          React.createElement(Icon, { name: "scan", size: 15, className: "spin" }),
          React.createElement("span", { style: { fontSize: 12.5, fontWeight: 600 } }, T("Analyzing packaging…", "กำลังวิเคราะห์บรรจุภัณฑ์…")),
          React.createElement("span", { className: "mono", style: { marginLeft: "auto", fontSize: 12 } }, Math.round(progress) + "%"))
      ),
      phase === "scanning" && React.createElement("div", { className: "bar-track", style: { marginBottom: 8 } },
        React.createElement("div", { className: "bar-fill", style: { width: progress + "%", transition: "width .25s" } })),
      phase === "scanning" && React.createElement("div", { style: { textAlign: "center", color: "var(--ink-3)", fontSize: 12.5 } },
        T("Detecting text regions and barcode…", "กำลังตรวจจับข้อความและบาร์โค้ด…")),

      // ---- review fields ----
      phase === "review" && React.createElement("div", null,
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9, marginBottom: 14 } },
          React.createElement("div", { style: { width: 28, height: 28, borderRadius: 8, background: "var(--pos-bg)", color: "var(--pos)", display: "grid", placeItems: "center" } }, React.createElement(Icon, { name: "check", size: 16, sw: 2.6 })),
          React.createElement("div", null,
            React.createElement("div", { style: { fontWeight: 600, fontSize: 14 } }, T("Extraction complete", "ดึงข้อมูลสำเร็จ")),
            React.createElement("div", { style: { fontSize: 11.5, color: "var(--ink-3)" } }, T("8 fields detected · review & confirm", "ตรวจพบ 8 ฟิลด์ · ตรวจสอบและยืนยัน"))),
          React.createElement("span", { className: "badge green", style: { marginLeft: "auto" } }, Math.round((data.confidence || 0.94) * 100) + "% " + T("match", "ความแม่นยำ"))),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" } },
          fields.slice(0, shown).map((f, i) => React.createElement("div", { key: i, className: "field-reveal", style: { display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "var(--surface)", borderBottom: i < fields.length - 1 ? "1px solid var(--line)" : "none" } },
            React.createElement("span", { style: { fontSize: 12, color: "var(--ink-3)", width: 130, flex: "none" } }, lang === "th" ? f.th : f.en),
            React.createElement("span", { style: { flex: 1, fontWeight: 600, fontSize: 13.5 } }, f.val),
            React.createElement("span", { className: "conf-chip" + (f.conf < 0.92 ? " mid" : "") }, Math.round(f.conf * 100) + "%"))))
      )
    )
  );
}

Object.assign(window, { OCRScanner });
