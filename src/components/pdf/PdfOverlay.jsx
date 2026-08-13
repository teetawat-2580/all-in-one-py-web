import React, { useState, useRef, useEffect } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Layers, Upload, Download, RefreshCw, X, List, CheckSquare } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

export default function PdfOverlay() {
  // Source PDF list
  const [pdfFiles, setPdfFiles] = useState([]); // [{file, name, numPages, customPages}]
  const [selectedPdfIdx, setSelectedPdfIdx] = useState(null);

  // Page mode per-file
  const [pageMode, setPageMode] = useState('all'); // all, range, preset, interactive
  const [rangeStr, setRangeStr] = useState('');
  const [preset, setPreset] = useState('First Page Only');

  // Watermark PNG
  const [wmFile, setWmFile] = useState(null);
  const [wmObjUrl, setWmObjUrl] = useState('');

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse page range string like Python's ov_parse_page_range
  const parsePageRange = (rangeStr, totalPages) => {
    const pages = new Set();
    if (!rangeStr || !rangeStr.trim()) return Array.from({ length: totalPages }, (_, i) => i);
    const parts = rangeStr.split(',');
    for (let part of parts) {
      part = part.trim().toLowerCase();
      if (!part) continue;
      if (part === 'last' || part === 'end') {
        pages.add(totalPages - 1);
      } else if (part.includes('-')) {
        const sub = part.split('-');
        if (sub.length === 2) {
          const sStr = sub[0].trim(), eStr = sub[1].trim();
          const sVal = (sStr === 'last' || sStr === 'end') ? totalPages : (parseInt(sStr) || 1);
          const eVal = (!eStr || eStr === 'last' || eStr === 'end') ? totalPages : (parseInt(eStr) || totalPages);
          for (let p = Math.max(1, sVal); p <= Math.min(totalPages, eVal); p++) pages.add(p - 1);
        }
      } else if (!isNaN(part)) {
        const val = parseInt(part);
        if (val >= 1 && val <= totalPages) pages.add(val - 1);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  // Get target pages for a file based on current mode
  const getTargetPages = (pdfEntry) => {
    const total = pdfEntry.numPages;
    if (pageMode === 'all') return Array.from({ length: total }, (_, i) => i);
    if (pageMode === 'range') return parsePageRange(rangeStr, total);
    if (pageMode === 'preset') {
      if (preset === 'First Page Only') return total > 0 ? [0] : [];
      if (preset === 'Last Page Only') return total > 0 ? [total - 1] : [];
      if (preset === 'Odd Pages') return Array.from({ length: total }, (_, i) => i).filter(i => (i + 1) % 2 !== 0);
      if (preset === 'Even Pages') return Array.from({ length: total }, (_, i) => i).filter(i => (i + 1) % 2 === 0);
    }
    if (pageMode === 'interactive') {
      return pdfEntry.customPages && pdfEntry.customPages.length > 0
        ? pdfEntry.customPages
        : Array.from({ length: total }, (_, i) => i);
    }
    return Array.from({ length: total }, (_, i) => i);
  };

  // Handle PDF file selection
  const handlePdfsChange = async (e) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const entries = [];
    for (let f of newFiles) {
      if (pdfFiles.some(p => p.name === f.name)) continue;
      try {
        const buf = await f.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        entries.push({
          file: f,
          name: f.name,
          numPages: doc.numPages,
          customPages: Array.from({ length: doc.numPages }, (_, i) => i),
          arrayBuffer: buf
        });
      } catch (err) {
        alert(`Could not load ${f.name}: ${err.message}`);
      }
    }
    setPdfFiles(prev => {
      const updated = [...prev, ...entries];
      if (selectedPdfIdx === null && updated.length > 0) setSelectedPdfIdx(0);
      return updated;
    });
  };

  const clearPdfs = () => {
    setPdfFiles([]);
    setSelectedPdfIdx(null);
  };

  const handleWmChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setWmFile(f);
      setWmObjUrl(URL.createObjectURL(f));
    }
  };

  // Toggle a page in interactive selection for selected PDF
  const togglePage = (pageIdx) => {
    if (selectedPdfIdx === null) return;
    setPdfFiles(prev => prev.map((entry, i) => {
      if (i !== selectedPdfIdx) return entry;
      const cur = entry.customPages || [];
      const exists = cur.includes(pageIdx);
      const updated = exists ? cur.filter(p => p !== pageIdx) : [...cur, pageIdx].sort((a, b) => a - b);
      return { ...entry, customPages: updated };
    }));
    setPageMode('interactive');
  };

  const setAllPages = (select) => {
    if (selectedPdfIdx === null) return;
    setPdfFiles(prev => prev.map((entry, i) => {
      if (i !== selectedPdfIdx) return entry;
      return { ...entry, customPages: select ? Array.from({ length: entry.numPages }, (_, i) => i) : [] };
    }));
    setPageMode('interactive');
  };

  const setPresetPages = (type) => {
    if (selectedPdfIdx === null) return;
    const entry = pdfFiles[selectedPdfIdx];
    const total = entry.numPages;
    let pages = [];
    if (type === 'odd') pages = Array.from({ length: total }, (_, i) => i).filter(i => (i + 1) % 2 !== 0);
    if (type === 'even') pages = Array.from({ length: total }, (_, i) => i).filter(i => (i + 1) % 2 === 0);
    if (type === 'first') pages = [0];
    if (type === 'last') pages = [total - 1];
    setPdfFiles(prev => prev.map((e, i) => i === selectedPdfIdx ? { ...e, customPages: pages } : e));
    setPageMode('interactive');
  };

  // Main processing: render PDF pages with PNG watermark overlaid via canvas, output ZIP
  const processOverlay = async () => {
    if (pdfFiles.length === 0) { alert('Please select at least one source PDF.'); return; }
    if (!wmFile) { alert('Please select a Watermark/Template PNG.'); return; }
    setIsProcessing(true);

    const zip = new JSZip();
    try {
      // Load watermark image
      const wmImg = new window.Image();
      await new Promise((res, rej) => {
        wmImg.onload = res;
        wmImg.onerror = rej;
        wmImg.src = wmObjUrl;
      });

      for (let entry of pdfFiles) {
        const targetPages = getTargetPages(entry);
        if (targetPages.length === 0) continue;

        const doc = await pdfjsLib.getDocument({ data: entry.arrayBuffer }).promise;
        const pdfName = entry.name.replace(/\.pdf$/i, '');
        const pdfFolder = zip.folder(pdfName + '_watermarked');

        for (let pageIdx of targetPages) {
          const page = await doc.getPage(pageIdx + 1);
          const viewport = page.getViewport({ scale: 2.0 }); // High quality render
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          // Step 1: Render PDF page
          await page.render({ canvasContext: ctx, viewport }).promise;

          // Step 2: Overlay PNG watermark full-page (like page.insert_image in Python)
          ctx.drawImage(wmImg, 0, 0, viewport.width, viewport.height);

          // Step 3: Export as PNG
          await new Promise((resolve) => {
            canvas.toBlob((blob) => {
              pdfFolder.file(`page_${pageIdx + 1}_watermarked.png`, blob);
              resolve();
            }, 'image/png');
          });
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'pdf_watermarked_pages.zip');
    } catch (err) {
      alert(`Processing error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedEntry = selectedPdfIdx !== null ? pdfFiles[selectedPdfIdx] : null;

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Watermark / Overlay PDF"
        description="Overlay transparent PNG logo watermarks, background templates, or stamps onto all or selected page(s) of PDF documents."
        workInstruction={`1. Click '1. Select Source PDF(s)' to choose target PDF files.\n2. Select page application mode ('All Pages', 'Page Range Expression', or 'Interactive Page Multi-Select').\n3. Click '2. Select Watermark/Template PNG', then click 'Apply PNG Watermark'.`}
        infographic={{ src: '/infographics/infographic_pdf_cover_overlay.png', title: 'Cover Adder, Overlay, Vectorizer & Coloring Books — Before & After' }}
      />

      {/* Step 1: File Selection & Watermark PNG */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: '#34d399' }} /> 1. File Selection & Watermark PNG
        </h3>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
          <label className="btn btn-primary">
            <Upload size={15} /> 1. Select Source PDF(s)
            <input type="file" multiple accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfsChange} />
          </label>
          <span style={{ fontSize: '13px', color: pdfFiles.length > 0 ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }}>
            {pdfFiles.length > 0 ? `${pdfFiles.length} file(s) selected` : 'No PDFs selected'}
          </span>
          {pdfFiles.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={clearPdfs}><X size={13} /> Clear List</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="btn btn-secondary">
            <Upload size={15} /> 2. Select Watermark/Template PNG
            <input type="file" accept="image/png" style={{ display: 'none' }} onChange={handleWmChange} />
          </label>
          {wmObjUrl && (
            <img src={wmObjUrl} alt="wm" style={{ width: 36, height: 36, objectFit: 'contain', background: '#fff', borderRadius: 4, border: '1px solid var(--border-color)' }} />
          )}
          <span style={{ fontSize: '13px', color: wmFile ? '#60a5fa' : 'var(--text-muted)' }}>
            {wmFile ? wmFile.name : 'No watermark PNG selected'}
          </span>
        </div>
      </div>

      {/* Step 2: PDF List + Page Mode + Interactive Selector */}
      {pdfFiles.length > 0 && (
        <div className="grid-2" style={{ marginBottom: '16px', gap: '16px' }}>
          {/* Left: PDF list + Page Mode */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700 }}>
              <List size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              2. Target PDF List & Page Mode
            </h3>

            <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(15,23,42,0.6)', borderRadius: 6, marginBottom: 12 }}>
              {pdfFiles.map((entry, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPdfIdx(idx)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                    background: selectedPdfIdx === idx ? 'rgba(6,182,212,0.2)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: selectedPdfIdx === idx ? '#34d399' : 'var(--text-main)',
                    fontWeight: selectedPdfIdx === idx ? 600 : 400
                  }}
                >
                  {entry.name} ({entry.numPages} pages)
                </div>
              ))}
            </div>

            {/* Page Mode Radio Buttons */}
            <div style={{ background: 'rgba(15,23,42,0.7)', padding: '12px', borderRadius: 8 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Target Page Mode
              </div>

              {[
                { value: 'all', label: 'All Pages' },
                { value: 'range', label: 'Page Range:' },
                { value: 'preset', label: 'Preset:' },
                { value: 'interactive', label: 'Interactive Page Multi-Select (Right Panel)' }
              ].map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '13px', marginBottom: 6 }}>
                  <input type="radio" name="pageMode" value={opt.value} checked={pageMode === opt.value} onChange={() => setPageMode(opt.value)} />
                  {opt.label}
                  {opt.value === 'range' && (
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '130px', padding: '2px 6px', fontSize: 12 }}
                      placeholder="e.g. 1, 3-5, last"
                      value={rangeStr}
                      onChange={e => { setRangeStr(e.target.value); setPageMode('range'); }}
                    />
                  )}
                  {opt.value === 'preset' && (
                    <select className="form-select" style={{ width: '160px', padding: '2px 6px', fontSize: 12 }}
                      value={preset} onChange={e => { setPreset(e.target.value); setPageMode('preset'); }}>
                      <option>First Page Only</option>
                      <option>Last Page Only</option>
                      <option>Odd Pages</option>
                      <option>Even Pages</option>
                    </select>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Right: Interactive Page Multi-Select */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>
              <CheckSquare size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              3. Interactive Page Multi-Select
            </h3>
            <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, marginBottom: 10 }}>
              {selectedEntry ? `Editing: ${selectedEntry.name} (${selectedEntry.numPages} pages)` : 'No PDF selected in list above'}
            </div>

            {/* Quick-select buttons */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {[
                { label: 'Select All', fn: () => setAllPages(true) },
                { label: 'Deselect All', fn: () => setAllPages(false) },
                { label: 'Odd Pages', fn: () => setPresetPages('odd') },
                { label: 'Even Pages', fn: () => setPresetPages('even') },
                { label: 'First Page', fn: () => setPresetPages('first') },
                { label: 'Last Page', fn: () => setPresetPages('last') },
              ].map(btn => (
                <button key={btn.label} className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}
                  disabled={!selectedEntry} onClick={btn.fn}>
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Page checkbox list */}
            <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(15,23,42,0.6)', borderRadius: 6, padding: '4px 0' }}>
              {selectedEntry ? (
                Array.from({ length: selectedEntry.numPages }, (_, i) => i).map(pageIdx => {
                  const isSelected = (selectedEntry.customPages || []).includes(pageIdx);
                  return (
                    <div
                      key={pageIdx}
                      onClick={() => togglePage(pageIdx)}
                      style={{
                        padding: '5px 12px', cursor: 'pointer', fontSize: '13px', userSelect: 'none',
                        background: isSelected ? 'rgba(6,182,212,0.15)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 8,
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ cursor: 'pointer' }} />
                      Page {pageIdx + 1}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px', textAlign: 'center' }}>
                  Select a PDF from the list
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Process Button */}
      <button
        className="btn btn-success btn-lg"
        style={{ width: '100%', marginTop: 8 }}
        disabled={!wmFile || pdfFiles.length === 0 || isProcessing}
        onClick={processOverlay}
      >
        {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
        {isProcessing ? 'Applying PNG Watermark...' : 'Apply PNG Watermark to Selected Page(s) (.ZIP)'}
      </button>
    </div>
  );
}
