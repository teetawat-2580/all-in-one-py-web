import React, { useState, useEffect, useRef } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Layers, Upload, Download, RefreshCw, Eye, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Check, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

export default function PngOverlay() {
  // Step 1 State
  const [sourceFormat, setSourceFormat] = useState('PNG'); // 'PNG' | 'PDF'
  const [pngFiles, setPngFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [pdfPageRange, setPdfPageRange] = useState('All');
  const [renderDpi, setRenderDpi] = useState('300 DPI');

  // Step 2 State
  const [templateFile, setTemplateFile] = useState(null);
  const [templateImgObj, setTemplateImgObj] = useState(null);
  const [templateUrl, setTemplateUrl] = useState('');

  // Processing & Modal State
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPageIndices, setPreviewPageIndices] = useState([]);
  const [currentPreviewIdx, setCurrentPreviewIdx] = useState(0);
  const [activePdfDoc, setActivePdfDoc] = useState(null);

  const previewCanvasRef = useRef(null);

  // Handle Template PNG Selection
  const handleTemplateChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTemplateFile(file);
      const url = URL.createObjectURL(file);
      setTemplateUrl(url);

      const img = new window.Image();
      img.onload = () => setTemplateImgObj(img);
      img.src = url;
    }
  };

  // Parse page range string (e.g. "All", "1-5", "1, 3, 5-8")
  const parsePageRange = (rangeStr, totalPages) => {
    if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    const pages = new Set();
    const parts = rangeStr.split(',');
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      if (part.includes('-')) {
        const sub = part.split('-');
        if (sub.length === 2 && !isNaN(sub[0]) && !isNaN(sub[1])) {
          const start = Math.max(1, parseInt(sub[0]));
          const end = Math.min(totalPages, parseInt(sub[1]));
          for (let p = start; p <= end; p++) pages.add(p - 1);
        }
      } else if (!isNaN(part)) {
        const p = parseInt(part);
        if (p >= 1 && p <= totalPages) pages.add(p - 1);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  // Preview Modal Trigger
  const handleOpenPreview = async () => {
    if (pdfFiles.length === 0) {
      alert('Please select at least one source PDF file first.');
      return;
    }
    try {
      const file = pdfFiles[0];
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const doc = await loadingTask.promise;
      setActivePdfDoc(doc);

      const indices = parsePageRange(pdfPageRange, doc.numPages);
      if (indices.length === 0) {
        alert(`No valid pages found in range string for PDF with ${doc.numPages} pages.`);
        return;
      }

      setPreviewPageIndices(indices);
      setCurrentPreviewIdx(0);
      setShowPreviewModal(true);
    } catch (err) {
      alert(`Error loading PDF for preview: ${err.message}`);
    }
  };

  // Render Preview Canvas
  useEffect(() => {
    if (!showPreviewModal || !activePdfDoc || previewPageIndices.length === 0) return;

    let isMounted = true;
    const renderPreviewPage = async () => {
      try {
        const pageIdx = previewPageIndices[currentPreviewIdx];
        const page = await activePdfDoc.getPage(pageIdx + 1);

        // Render at scale for preview
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = previewCanvasRef.current || document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        // Draw PDF Page
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Overlay Watermark Template if loaded
        if (templateImgObj) {
          ctx.drawImage(templateImgObj, 0, 0, viewport.width, viewport.height);
        }
      } catch (err) {
        console.error('Preview render error:', err);
      }
    };

    renderPreviewPage();
    return () => { isMounted = false; };
  }, [showPreviewModal, activePdfDoc, currentPreviewIdx, previewPageIndices, templateImgObj]);

  // Main Processing Function
  const processOverlay = async () => {
    if (!templateFile) {
      alert('Please select a Watermark/Template PNG image.');
      return;
    }

    setIsProcessing(true);
    const zip = new JSZip();

    try {
      if (sourceFormat === 'PNG') {
        if (pngFiles.length === 0) {
          alert('Please select at least one source PNG file.');
          setIsProcessing(false);
          return;
        }

        for (let file of pngFiles) {
          await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const baseImg = new window.Image();
              baseImg.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = baseImg.width;
                canvas.height = baseImg.height;
                const ctx = canvas.getContext('2d');

                // Draw base image
                ctx.drawImage(baseImg, 0, 0);

                // Resize & overlay watermark template
                if (templateImgObj) {
                  ctx.drawImage(templateImgObj, 0, 0, baseImg.width, baseImg.height);
                }

                canvas.toBlob((blob) => {
                  const baseName = file.name.replace(/\.[^/.]+$/, '');
                  zip.file(`${baseName}_watermark.png`, blob);
                  resolve();
                }, 'image/png');
              };
              baseImg.src = e.target.result;
            };
            reader.readAsDataURL(file);
          });
        }
      } else {
        // PDF Source Mode
        if (pdfFiles.length === 0) {
          alert('Please select at least one source PDF file.');
          setIsProcessing(false);
          return;
        }

        const dpiVal = parseInt(renderDpi.split(' ')[0]) || 300;
        const scale = dpiVal / 72;

        for (let pdfFile of pdfFiles) {
          const buffer = await pdfFile.arrayBuffer();
          const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
          const selectedPages = parsePageRange(pdfPageRange, doc.numPages);
          const pdfName = pdfFile.name.replace(/\.pdf$/i, '');

          for (let pageIdx of selectedPages) {
            const page = await doc.getPage(pageIdx + 1);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            // Render PDF Page to Canvas at target DPI
            await page.render({ canvasContext: ctx, viewport }).promise;

            // Overlay Watermark Template PNG
            if (templateImgObj) {
              ctx.drawImage(templateImgObj, 0, 0, viewport.width, viewport.height);
            }

            await new Promise((resolve) => {
              canvas.toBlob((blob) => {
                zip.file(`${pdfName}_page_${pageIdx + 1}_watermark.png`, blob);
                resolve();
              }, 'image/png');
            });
          }
        }
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, 'watermarked_png_images.zip');
    } catch (err) {
      alert(`Processing error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="png"
        title="Watermark / Overlay PNG"
        description="Overlay watermark/stamp PNG logos onto target PNG images or selected pages of PDF documents (exporting as watermarked PNG images)."
        workInstruction={`1. Choose Source Input Mode: 'PNG File(s)' or 'PDF File(s)'.\n2. Select source files. If PDF, specify page/pages (e.g., 'All', '1-5', '1, 3, 5'), click 'Preview Page(s)', and set rendering DPI.\n3. Select Watermark/Template PNG image and click 'Process Watermark Overlay'.`}
        infographic={{ src: '/infographics/infographic_png_tools.png', title: 'PNG Size Reducer, Margin Trimmer, Table Slicer & Watermark — Before & After' }}
      />

      {/* Step 1: Select Source Type & Source Files */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: '#34d399' }} /> Step 1: Select Source Type & Source Files
        </h3>

        {/* Radio buttons for Source Format */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Source Format:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
            <input
              type="radio"
              name="sourceFormat"
              value="PNG"
              checked={sourceFormat === 'PNG'}
              onChange={() => setSourceFormat('PNG')}
            />
            PNG File(s)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
            <input
              type="radio"
              name="sourceFormat"
              value="PDF"
              checked={sourceFormat === 'PDF'}
              onChange={() => setSourceFormat('PDF')}
            />
            PDF File(s)
          </label>
        </div>

        {/* PNG Selection Row */}
        <div className="grid-2" style={{ alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <label className={`btn ${sourceFormat === 'PNG' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', opacity: sourceFormat === 'PNG' ? 1 : 0.5 }}>
              <Upload size={16} /> Select Source PNG(s)
              <input
                type="file"
                multiple
                accept="image/png"
                disabled={sourceFormat !== 'PNG'}
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && setPngFiles(Array.from(e.target.files))}
              />
            </label>
          </div>
          <span style={{ fontSize: '13px', color: sourceFormat === 'PNG' ? '#34d399' : 'var(--text-muted)' }}>
            {pngFiles.length > 0 ? `${pngFiles.length} source PNG image(s) selected` : 'No PNG images selected'}
          </span>
        </div>

        {/* PDF Selection Row */}
        <div className="grid-2" style={{ alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <label className={`btn ${sourceFormat === 'PDF' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', opacity: sourceFormat === 'PDF' ? 1 : 0.5 }}>
              <Upload size={16} /> Select Source PDF(s)
              <input
                type="file"
                multiple
                accept="application/pdf"
                disabled={sourceFormat !== 'PDF'}
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && setPdfFiles(Array.from(e.target.files))}
              />
            </label>
          </div>
          <span style={{ fontSize: '13px', color: sourceFormat === 'PDF' ? '#60a5fa' : 'var(--text-muted)' }}>
            {pdfFiles.length > 0 ? `${pdfFiles.length} PDF document(s) selected (${pdfFiles.map(f => f.name).join(', ')})` : 'No PDF files selected'}
          </span>
        </div>

        {/* PDF Options Subframe */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '8px', opacity: sourceFormat === 'PDF' ? 1 : 0.4, pointerEvents: sourceFormat === 'PDF' ? 'auto' : 'none' }}>
          <div className="grid-3" style={{ alignItems: 'center' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Page/Pages:</label>
              <input
                type="text"
                className="form-input"
                value={pdfPageRange}
                disabled={sourceFormat !== 'PDF'}
                onChange={(e) => setPdfPageRange(e.target.value)}
                placeholder="e.g. All, 1-5, 1, 3, 5-8"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="form-label">&nbsp;</label>
              <button
                className="btn btn-secondary"
                disabled={sourceFormat !== 'PDF' || pdfFiles.length === 0}
                onClick={handleOpenPreview}
              >
                <Eye size={16} /> 🔍 Preview Page(s)
              </button>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Render DPI:</label>
              <select
                className="form-select"
                value={renderDpi}
                disabled={sourceFormat !== 'PDF'}
                onChange={(e) => setRenderDpi(e.target.value)}
              >
                <option value="72 DPI">72 DPI</option>
                <option value="150 DPI">150 DPI</option>
                <option value="300 DPI">300 DPI</option>
                <option value="600 DPI">600 DPI</option>
              </select>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
            Specifying page range (e.g. 'All', '1-5', '1, 3, 5-8') renders PDF vector pages into high-resolution watermarked PNG images.
          </span>
        </div>
      </div>

      {/* Step 2: Select Watermark Template & Output Directory */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ImageIcon size={18} style={{ color: '#60a5fa' }} /> Step 2: Select Watermark Template & Output Options
        </h3>

        <div className="grid-2" style={{ alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <label className="btn btn-secondary" style={{ width: '100%' }}>
              <Upload size={16} /> Select Watermark/Template PNG
              <input type="file" accept="image/png" style={{ display: 'none' }} onChange={handleTemplateChange} />
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {templateUrl && (
              <img src={templateUrl} alt="Watermark Template" style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#fff', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            )}
            <span style={{ fontSize: '13px', color: templateFile ? '#34d399' : 'var(--text-muted)' }}>
              {templateFile ? templateFile.name : 'No Watermark PNG selected'}
            </span>
          </div>
        </div>

        <button
          className="btn btn-success btn-lg"
          style={{ width: '100%', marginTop: '10px' }}
          disabled={!templateFile || isProcessing || (sourceFormat === 'PNG' ? pngFiles.length === 0 : pdfFiles.length === 0)}
          onClick={processOverlay}
        >
          {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
          {isProcessing ? 'Processing Watermark Overlay...' : 'Process Watermark Overlay (.ZIP)'}
        </button>
      </div>

      {/* Interactive Page Preview Modal */}
      {showPreviewModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '700px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>
                  Preview Selected Page(s) — {pdfFiles[0]?.name}
                </h3>
                <span style={{ fontSize: '12px', color: templateImgObj ? '#34d399' : '#fbbf24' }}>
                  {templateImgObj ? '✨ Showing Live Watermark Overlay Preview' : 'ℹ️ Select a Watermark PNG in Step 2 to preview with watermark overlay'}
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPreviewModal(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Navigation Bar inside Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 12px 0', background: 'rgba(15, 23, 42, 0.8)', padding: '8px 12px', borderRadius: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPreviewIdx <= 0}
                onClick={() => setCurrentPreviewIdx(i => Math.max(0, i - 1))}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                Page {currentPreviewIdx + 1} of {previewPageIndices.length} (PDF Page {previewPageIndices[currentPreviewIdx] + 1} / {activePdfDoc?.numPages})
              </span>

              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPreviewIdx >= previewPageIndices.length - 1}
                onClick={() => setCurrentPreviewIdx(i => Math.min(previewPageIndices.length - 1, i + 1))}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>

            {/* Canvas Render Container */}
            <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
              <canvas ref={previewCanvasRef} style={{ border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', maxWidth: '100%', maxHeight: '550px' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
