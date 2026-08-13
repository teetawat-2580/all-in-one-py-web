import React, { useState, useRef, useEffect, useCallback } from 'react';
import InfoHeader from '../common/InfoHeader';
import { BookOpen, Upload, Download, RefreshCw, ChevronLeft, ChevronRight, Layers, Image as ImageIcon, Eye, Check } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';

const PAGE_SIZES = {
  'A4 (210 x 297 mm)': { w: (210 / 25.4), h: (297 / 25.4) }, // in inches
  'Letter (8.5 x 11 in)': { w: 8.5, h: 11 },
  'Square (8.5 x 8.5 in)': { w: 8.5, h: 8.5 },
  'Natural Image Size': null
};

const FIT_MODES = ['Fit (Aspect Ratio)', 'Fill (Stretch)', 'Center (Natural Size)'];
const WM_POSITIONS = ['Center', 'Full Page Overlay', 'Bottom Right', 'Bottom Left', 'Top Right', 'Top Left'];
const DPI_OPTIONS = [72, 96, 150, 300, 600];

const DEFAULT_PAGE_SETTINGS = {
  scale: 100,
  margin: 0,
  fitMode: 'Fit (Aspect Ratio)',
  rotation: 0,
  wmPosition: 'Center',
  sampleWmPosition: 'Center',
  sampleWmScale: 60
};

export default function PdfColoringBooks() {
  // PNG file list
  const [pngFiles, setPngFiles] = useState([]); // [{file, name, objUrl}]
  const [pageSettings, setPageSettings] = useState({}); // {idx: settings}

  // Watermarks
  const [mainWmFile, setMainWmFile] = useState(null);
  const [mainWmUrl, setMainWmUrl] = useState('');
  const [sampleWmFile, setSampleWmFile] = useState(null);
  const [sampleWmUrl, setSampleWmUrl] = useState('');

  // Page size preset
  const [pageSizePreset, setPageSizePreset] = useState('A4 (210 x 297 mm)');

  // Current page idx
  const [currentIdx, setCurrentIdx] = useState(0);

  // Active page controls (bound to current page settings)
  const [scale, setScale] = useState(100);
  const [margin, setMargin] = useState(0);
  const [fitMode, setFitMode] = useState('Fit (Aspect Ratio)');
  const [rotation, setRotation] = useState(0);
  const [wmPosition, setWmPosition] = useState('Center');
  const [sampleWmPosition, setSampleWmPosition] = useState('Center');
  const [sampleWmScale, setSampleWmScale] = useState(60);

  // Preview
  const [showSampleWm, setShowSampleWm] = useState(true);
  const previewCanvasRef = useRef(null);

  // Export options
  const [pdfDpi, setPdfDpi] = useState(300);
  const [pngDpi, setPngDpi] = useState(300);

  // Processing state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  // Watermark image cache
  const mainWmImgRef = useRef(null);
  const sampleWmImgRef = useRef(null);

  // Load wm images into refs when URL changes
  useEffect(() => {
    if (mainWmUrl) {
      const img = new window.Image();
      img.onload = () => { mainWmImgRef.current = img; updatePreview(); };
      img.src = mainWmUrl;
    } else {
      mainWmImgRef.current = null;
    }
  }, [mainWmUrl]);

  useEffect(() => {
    if (sampleWmUrl) {
      const img = new window.Image();
      img.onload = () => { sampleWmImgRef.current = img; updatePreview(); };
      img.src = sampleWmUrl;
    } else {
      sampleWmImgRef.current = null;
    }
  }, [sampleWmUrl]);

  // Load current page settings into controls when currentIdx changes
  useEffect(() => {
    const st = pageSettings[currentIdx] || DEFAULT_PAGE_SETTINGS;
    setScale(st.scale);
    setMargin(st.margin);
    setFitMode(st.fitMode);
    setRotation(st.rotation);
    setWmPosition(st.wmPosition);
    setSampleWmPosition(st.sampleWmPosition);
    setSampleWmScale(st.sampleWmScale);
  }, [currentIdx, pngFiles.length]);

  // Handle PNG selection
  const handlePngsChange = (e) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setPngFiles(prev => {
      const existing = new Set(prev.map(p => p.name));
      const toAdd = newFiles.filter(f => !existing.has(f.name)).map(f => ({
        file: f,
        name: f.name,
        objUrl: URL.createObjectURL(f)
      }));
      const updated = [...prev, ...toAdd];
      // Initialize settings for new pages
      setPageSettings(ps => {
        const newPs = { ...ps };
        toAdd.forEach((_, i) => {
          const idx = prev.length + i;
          if (!newPs[idx]) newPs[idx] = { ...DEFAULT_PAGE_SETTINGS };
        });
        return newPs;
      });
      if (prev.length === 0 && toAdd.length > 0) setCurrentIdx(0);
      return updated;
    });
  };

  const clearPngs = () => {
    pngFiles.forEach(p => URL.revokeObjectURL(p.objUrl));
    setPngFiles([]);
    setPageSettings({});
    setCurrentIdx(0);
    const canvas = previewCanvasRef.current;
    if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  };

  // Save current controls into pageSettings[currentIdx]
  const getCurrentSettings = useCallback(() => ({
    scale, margin, fitMode, rotation, wmPosition, sampleWmPosition, sampleWmScale
  }), [scale, margin, fitMode, rotation, wmPosition, sampleWmPosition, sampleWmScale]);

  const saveActivePageSettings = useCallback(() => {
    if (currentIdx < pngFiles.length) {
      setPageSettings(prev => ({ ...prev, [currentIdx]: getCurrentSettings() }));
    }
  }, [currentIdx, pngFiles.length, getCurrentSettings]);

  const applySettingsToAll = () => {
    saveActivePageSettings();
    const st = getCurrentSettings();
    const newPs = {};
    pngFiles.forEach((_, i) => { newPs[i] = { ...st }; });
    setPageSettings(newPs);
    alert(`Applied settings to all ${pngFiles.length} page(s)!`);
  };

  // Render page to canvas
  const renderPageToCanvas = async (pageIdx, dpi, includeSampleWm, targetCanvas) => {
    if (pageIdx >= pngFiles.length) return null;
    const entry = pngFiles[pageIdx];
    const st = pageSettings[pageIdx] || DEFAULT_PAGE_SETTINGS;

    const preset = PAGE_SIZES[pageSizePreset];
    let fullW, fullH;
    if (preset) {
      fullW = Math.round(preset.w * dpi);
      fullH = Math.round(preset.h * dpi);
    } else {
      // Natural — load image size
      await new Promise(res => {
        const img = new window.Image();
        img.onload = () => { fullW = img.naturalWidth; fullH = img.naturalHeight; res(); };
        img.src = entry.objUrl;
      });
    }

    const canvas = targetCanvas || document.createElement('canvas');
    canvas.width = fullW;
    canvas.height = fullH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, fullW, fullH);

    // Load source image
    const srcImg = new window.Image();
    await new Promise(res => { srcImg.onload = res; srcImg.src = entry.objUrl; });

    // Apply rotation then draw
    const marginPct = st.margin / 100;
    const availW = fullW * (1 - 2 * marginPct);
    const availH = fullH * (1 - 2 * marginPct);
    const scalePct = st.scale / 100;

    // Rotate image if needed using an offscreen canvas
    let rotatedImg = srcImg;
    let rotW = srcImg.naturalWidth, rotH = srcImg.naturalHeight;
    if (st.rotation !== 0) {
      const rotCanvas = document.createElement('canvas');
      const rad = (st.rotation * Math.PI) / 180;
      if (st.rotation === 90 || st.rotation === 270) { rotCanvas.width = srcImg.naturalHeight; rotCanvas.height = srcImg.naturalWidth; }
      else { rotCanvas.width = srcImg.naturalWidth; rotCanvas.height = srcImg.naturalHeight; }
      const rc = rotCanvas.getContext('2d');
      rc.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rc.rotate(rad);
      rc.drawImage(srcImg, -srcImg.naturalWidth / 2, -srcImg.naturalHeight / 2);
      rotatedImg = rotCanvas;
      rotW = rotCanvas.width;
      rotH = rotCanvas.height;
    }

    let finalW, finalH;
    const aspectSrc = rotW / rotH;
    const aspectAvail = availW / availH;

    if (st.fitMode === 'Fill (Stretch)') {
      finalW = Math.round(availW * scalePct);
      finalH = Math.round(availH * scalePct);
    } else if (st.fitMode === 'Center (Natural Size)') {
      const sf = (fullW / (preset ? preset.w * 96 : fullW)) * scalePct;
      finalW = Math.round(rotW * sf);
      finalH = Math.round(rotH * sf);
    } else { // Fit (Aspect Ratio)
      if (aspectSrc > aspectAvail) {
        finalW = Math.round(availW * scalePct);
        finalH = Math.round(finalW / aspectSrc);
      } else {
        finalH = Math.round(availH * scalePct);
        finalW = Math.round(finalH * aspectSrc);
      }
    }

    const pasteX = Math.round((fullW - finalW) / 2);
    const pasteY = Math.round((fullH - finalH) / 2);
    ctx.drawImage(rotatedImg, pasteX, pasteY, finalW, finalH);

    // Main watermark overlay
    const mainWm = mainWmImgRef.current;
    if (mainWm) {
      const pos = st.wmPosition;
      if (pos === 'Full Page Overlay') {
        ctx.drawImage(mainWm, 0, 0, fullW, fullH);
      } else {
        const twW = Math.round(fullW * 0.8), twH = Math.round(fullH * 0.8);
        const asp = mainWm.naturalWidth / mainWm.naturalHeight;
        let wmW, wmH;
        if (twW / twH > asp) { wmH = twH; wmW = Math.round(wmH * asp); }
        else { wmW = twW; wmH = Math.round(wmW / asp); }
        let wx, wy;
        const off = Math.round(fullW * 0.02);
        if (pos === 'Bottom Right') { wx = fullW - wmW - off; wy = fullH - wmH - off; }
        else if (pos === 'Bottom Left') { wx = off; wy = fullH - wmH - off; }
        else if (pos === 'Top Right') { wx = fullW - wmW - off; wy = off; }
        else if (pos === 'Top Left') { wx = off; wy = off; }
        else { wx = Math.round((fullW - wmW) / 2); wy = Math.round((fullH - wmH) / 2); }
        ctx.drawImage(mainWm, wx, wy, wmW, wmH);
      }
    }

    // Sample watermark overlay
    const sampleWm = sampleWmImgRef.current;
    if (includeSampleWm && sampleWm) {
      const spos = st.sampleWmPosition;
      const sscale = st.sampleWmScale / 100;
      if (spos === 'Full Page Overlay') {
        ctx.drawImage(sampleWm, 0, 0, fullW, fullH);
      } else {
        const stW = Math.round(fullW * sscale), stH = Math.round(fullH * sscale);
        const asp = sampleWm.naturalWidth / sampleWm.naturalHeight;
        let swmW, swmH;
        if (stW / stH > asp) { swmH = stH; swmW = Math.round(swmH * asp); }
        else { swmW = stW; swmH = Math.round(swmW / asp); }
        let swx, swy;
        const off = Math.round(fullW * 0.02);
        if (spos === 'Bottom Right') { swx = fullW - swmW - off; swy = fullH - swmH - off; }
        else if (spos === 'Bottom Left') { swx = off; swy = fullH - swmH - off; }
        else if (spos === 'Top Right') { swx = fullW - swmW - off; swy = off; }
        else if (spos === 'Top Left') { swx = off; swy = off; }
        else { swx = Math.round((fullW - swmW) / 2); swy = Math.round((fullH - swmH) / 2); }
        ctx.drawImage(sampleWm, swx, swy, swmW, swmH);
      }
    }

    return canvas;
  };

  // Update preview canvas
  const updatePreview = useCallback(async () => {
    if (pngFiles.length === 0 || !previewCanvasRef.current) return;
    saveActivePageSettings();
    const previewCanvas = document.createElement('canvas');
    const rendered = await renderPageToCanvas(currentIdx, 96, showSampleWm, previewCanvas);
    if (!rendered || !previewCanvasRef.current) return;

    // Scale to fit preview area
    const maxW = 380, maxH = 480;
    const scaleRatio = Math.min(maxW / rendered.width, maxH / rendered.height);
    const dispW = Math.round(rendered.width * scaleRatio);
    const dispH = Math.round(rendered.height * scaleRatio);

    const canvas = previewCanvasRef.current;
    canvas.width = dispW;
    canvas.height = dispH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(rendered, 0, 0, dispW, dispH);
  }, [currentIdx, pngFiles, pageSettings, pageSizePreset, showSampleWm, scale, margin, fitMode, rotation, wmPosition, sampleWmPosition, sampleWmScale]);

  // Auto-refresh preview when settings change
  useEffect(() => {
    const timer = setTimeout(updatePreview, 300);
    return () => clearTimeout(timer);
  }, [updatePreview]);

  // Export as PDF
  const exportPdf = async () => {
    if (pngFiles.length === 0) { alert('Please select PNG files first.'); return; }
    setIsExportingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const preset = PAGE_SIZES[pageSizePreset];

      for (let i = 0; i < pngFiles.length; i++) {
        const canvas = await renderPageToCanvas(i, pdfDpi, false);
        const pngDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const pngRes = await fetch(pngDataUrl);
        const jpgBytes = await pngRes.arrayBuffer();
        const img = await pdfDoc.embedJpg(jpgBytes);

        let ptW, ptH;
        if (pageSizePreset === 'A4 (210 x 297 mm)') { ptW = 595.28; ptH = 841.89; }
        else if (pageSizePreset === 'Letter (8.5 x 11 in)') { ptW = 612; ptH = 792; }
        else if (pageSizePreset === 'Square (8.5 x 8.5 in)') { ptW = 612; ptH = 612; }
        else { ptW = canvas.width * 72 / pdfDpi; ptH = canvas.height * 72 / pdfDpi; }

        const page = pdfDoc.addPage([ptW, ptH]);
        page.drawImage(img, { x: 0, y: 0, width: ptW, height: ptH });
      }

      const pdfBytes = await pdfDoc.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `coloring_book_${pngFiles.length}_pages.pdf`);
    } catch (err) {
      alert(`PDF export error: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export single page as PNG
  const exportSinglePng = async () => {
    if (pngFiles.length === 0) { alert('Please select PNG files first.'); return; }
    setIsExportingPng(true);
    try {
      const canvas = await renderPageToCanvas(currentIdx, pngDpi, true);
      await new Promise(resolve => {
        canvas.toBlob(blob => {
          const baseName = pngFiles[currentIdx].name.replace(/\.[^/.]+$/, '');
          saveAs(blob, `${baseName}_sample_page_${currentIdx + 1}.png`);
          resolve();
        }, 'image/png');
      });
    } catch (err) {
      alert(`PNG export error: ${err.message}`);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleControlChange = (setter) => (val) => {
    setter(val);
    // auto-save active page settings
    setTimeout(() => {
      setPageSettings(prev => ({
        ...prev,
        [currentIdx]: {
          scale, margin, fitMode, rotation, wmPosition, sampleWmPosition, sampleWmScale,
          ...{ [setter === setScale ? 'scale' : setter === setMargin ? 'margin' : setter === setFitMode ? 'fitMode' : setter === setRotation ? 'rotation' : setter === setWmPosition ? 'wmPosition' : setter === setSampleWmPosition ? 'sampleWmPosition' : 'sampleWmScale']: val }
        }
      }));
    }, 0);
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Coloring books 20 pages"
        description="Batch process coloring book page PNGs with live preview, per-page scaling/sizing adjustments, main watermark overlay across all pages, PDF compilation at selective DPI, and sample page PNG export."
        workInstruction={`1. Click '1. Select PNGs' to load your coloring book page images.\n2. Select '2. Main Watermark PNG' (applied to all pages) and '3. Sample Watermark PNG' (for single sample page export).\n3. Use the Left Page List & Controls to adjust image scale/margins.\n4. Preview rendered pages on the Right Live Canvas.\n5. Click 'Export Pages as PDF' or 'Export Single Page as Sample PNG'.`}
      />

      {/* Top: File & Watermark Selection */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'start' }}>

          <div>
            <label className="btn btn-primary" style={{ width: '100%', marginBottom: 6 }}>
              <Upload size={14} /> 1. Select PNGs
              <input type="file" multiple accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handlePngsChange} />
            </label>
            <div style={{ fontSize: 12, color: pngFiles.length > 0 ? '#34d399' : 'var(--text-muted)' }}>
              {pngFiles.length} PNG(s) loaded
              {pngFiles.length > 0 && <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8, padding: '1px 6px', fontSize: 11 }} onClick={clearPngs}>Clear</button>}
            </div>
          </div>

          <div>
            <label className="btn btn-secondary" style={{ width: '100%', marginBottom: 6 }}>
              <Upload size={14} /> 2. Main Watermark PNG
              <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={e => {
                if (e.target.files?.[0]) { const f = e.target.files[0]; setMainWmFile(f); setMainWmUrl(URL.createObjectURL(f)); }
              }} />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {mainWmUrl && <img src={mainWmUrl} alt="main wm" style={{ width: 24, height: 24, objectFit: 'contain', background: '#fff', borderRadius: 3 }} />}
              <span style={{ fontSize: 11, color: mainWmFile ? '#60a5fa' : 'var(--text-muted)' }}>{mainWmFile ? mainWmFile.name : 'None'}</span>
            </div>
          </div>

          <div>
            <label className="btn btn-secondary" style={{ width: '100%', marginBottom: 6 }}>
              <Upload size={14} /> 3. Sample Watermark PNG
              <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={e => {
                if (e.target.files?.[0]) { const f = e.target.files[0]; setSampleWmFile(f); setSampleWmUrl(URL.createObjectURL(f)); }
              }} />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {sampleWmUrl && <img src={sampleWmUrl} alt="sample wm" style={{ width: 24, height: 24, objectFit: 'contain', background: '#fff', borderRadius: 3 }} />}
              <span style={{ fontSize: 11, color: sampleWmFile ? '#a78bfa' : 'var(--text-muted)' }}>{sampleWmFile ? sampleWmFile.name : 'None'}</span>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 12 }}>Page Size Preset:</label>
            <select className="form-select" value={pageSizePreset} onChange={e => setPageSizePreset(e.target.value)}>
              {Object.keys(PAGE_SIZES).map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Middle: Page List & Controls | Live Preview */}
      {pngFiles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '14px', marginBottom: '14px' }}>

          {/* Left: Page List + Controls */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700 }}>2. Page List & Page Sizing Controls</h3>

            {/* Page list */}
            <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(15,23,42,0.6)', borderRadius: 6, marginBottom: 10 }}>
              {pngFiles.map((entry, idx) => (
                <div key={idx} onClick={() => setCurrentIdx(idx)} style={{
                  padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                  background: currentIdx === idx ? 'rgba(6,182,212,0.2)' : 'transparent',
                  color: currentIdx === idx ? '#34d399' : 'var(--text-main)',
                  fontWeight: currentIdx === idx ? 600 : 400,
                  borderBottom: '1px solid rgba(255,255,255,0.04)'
                }}>
                  Page {idx + 1}: {entry.name}
                </div>
              ))}
            </div>

            {/* Settings controls */}
            <div style={{ background: 'rgba(15,23,42,0.7)', padding: '10px', borderRadius: 8, fontSize: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Scaling Mode:</label>
                  <select className="form-select" style={{ fontSize: 12 }} value={fitMode}
                    onChange={e => { setFitMode(e.target.value); setPageSettings(p => ({ ...p, [currentIdx]: { ...getCurrentSettings(), fitMode: e.target.value } })); }}>
                    {FIT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Orientation (°):</label>
                  <select className="form-select" style={{ fontSize: 12 }} value={rotation}
                    onChange={e => { const v = Number(e.target.value); setRotation(v); setPageSettings(p => ({ ...p, [currentIdx]: { ...getCurrentSettings(), rotation: v } })); }}>
                    {[0, 90, 180, 270].map(v => <option key={v} value={v}>{v}°</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Image Scale (%):</label>
                  <input type="number" className="form-input" style={{ fontSize: 12 }} min={10} max={200} value={scale}
                    onChange={e => { const v = Number(e.target.value); setScale(v); setPageSettings(p => ({ ...p, [currentIdx]: { ...getCurrentSettings(), scale: v } })); }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Page Margin (%):</label>
                  <input type="number" className="form-input" style={{ fontSize: 12 }} min={0} max={30} value={margin}
                    onChange={e => { const v = Number(e.target.value); setMargin(v); setPageSettings(p => ({ ...p, [currentIdx]: { ...getCurrentSettings(), margin: v } })); }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Main WM Pos:</label>
                  <select className="form-select" style={{ fontSize: 12 }} value={wmPosition}
                    onChange={e => { setWmPosition(e.target.value); setPageSettings(p => ({ ...p, [currentIdx]: { ...getCurrentSettings(), wmPosition: e.target.value } })); }}>
                    {WM_POSITIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Sample WM Pos:</label>
                  <select className="form-select" style={{ fontSize: 12 }} value={sampleWmPosition}
                    onChange={e => { setSampleWmPosition(e.target.value); setPageSettings(p => ({ ...p, [currentIdx]: { ...getCurrentSettings(), sampleWmPosition: e.target.value } })); }}>
                    {WM_POSITIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Sample WM Scale (%):</label>
                  <input type="number" className="form-input" style={{ fontSize: 12 }} min={10} max={100} value={sampleWmScale}
                    onChange={e => { const v = Number(e.target.value); setSampleWmScale(v); setPageSettings(p => ({ ...p, [currentIdx]: { ...getCurrentSettings(), sampleWmScale: v } })); }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={saveActivePageSettings}>
                  <Check size={12} /> Save Active Page Settings
                </button>
                <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={applySettingsToAll}>
                  <Layers size={12} /> Apply Settings to All Pages
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700 }}>3. Live Page Preview & Watermark Inspector</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" disabled={currentIdx <= 0}
                  onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); }}>
                  <ChevronLeft size={13} /> Prev
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, padding: '4px 0' }}>
                  Page: {currentIdx + 1} / {pngFiles.length}
                </span>
                <button className="btn btn-secondary btn-sm" disabled={currentIdx >= pngFiles.length - 1}
                  onClick={() => { setCurrentIdx(i => Math.min(pngFiles.length - 1, i + 1)); }}>
                  Next <ChevronRight size={13} />
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={showSampleWm} onChange={e => setShowSampleWm(e.target.checked)} />
                <Eye size={13} /> Preview Sample Watermark Overlay
              </label>
            </div>

            <div style={{ flexGrow: 1, background: '#1e293b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 340, overflow: 'hidden', padding: 10 }}>
              <canvas ref={previewCanvasRef} style={{ border: '1px solid var(--border-color)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', maxWidth: '100%', maxHeight: '420px' }} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom: Export Options */}
      {pngFiles.length > 0 && (
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700 }}>4. Export Options</h3>
          <div className="grid-2" style={{ gap: '20px' }}>

            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '14px', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#34d399' }}>Export All Pages as PDF:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <label style={{ fontSize: 13 }}>Resolution (DPI):</label>
                <select className="form-select" style={{ width: 100 }} value={pdfDpi} onChange={e => setPdfDpi(Number(e.target.value))}>
                  {DPI_OPTIONS.map(d => <option key={d} value={d}>{d} DPI</option>)}
                </select>
              </div>
              <button className="btn btn-success" style={{ width: '100%' }} disabled={isExportingPdf} onClick={exportPdf}>
                {isExportingPdf ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                {isExportingPdf ? 'Exporting...' : `Export ${pngFiles.length} Pages as PDF`}
              </button>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '14px', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#60a5fa' }}>Export Selected Page as Sample PNG:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <label style={{ fontSize: 13 }}>Resolution (DPI):</label>
                <select className="form-select" style={{ width: 100 }} value={pngDpi} onChange={e => setPngDpi(Number(e.target.value))}>
                  {DPI_OPTIONS.map(d => <option key={d} value={d}>{d} DPI</option>)}
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={isExportingPng} onClick={exportSinglePng}>
                {isExportingPng ? <RefreshCw size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                {isExportingPng ? 'Exporting...' : `Export Page ${currentIdx + 1} as Sample PNG`}
              </button>
            </div>
          </div>
        </div>
      )}

      {pngFiles.length === 0 && (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BookOpen size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>Select PNG coloring page images above to get started.</div>
        </div>
      )}
    </div>
  );
}
