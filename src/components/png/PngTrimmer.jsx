import React, { useState, useEffect } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Crop, Upload, Download, FileText, Check } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function PngTrimmer() {
  const [files, setFiles] = useState([]);
  const [tolerance, setTolerance] = useState(10);
  const [pageSize, setPageSize] = useState('auto'); // auto, a4, letter
  const [pageMargin, setPageMargin] = useState(10); // pt
  const [trimmedPreviews, setTrimmedPreviews] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  useEffect(() => {
    if (files.length === 0) {
      setTrimmedPreviews([]);
      return;
    }

    let isMounted = true;
    const processPreviews = async () => {
      const previews = [];

      for (let file of files) {
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);

              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              const data = imageData.data;

              // Find bounding box ignoring transparent/white pixels with tolerance
              let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
              const tol = Number(tolerance);

              for (let y = 0; y < img.height; y++) {
                for (let x = 0; x < img.width; x++) {
                  const idx = (y * img.width + x) * 4;
                  const r = data[idx];
                  const g = data[idx + 1];
                  const b = data[idx + 2];
                  const a = data[idx + 3];

                  const isTransparent = a < 10;
                  const isWhite = r > (255 - tol) && g > (255 - tol) && b > (255 - tol);

                  if (!isTransparent && !isWhite) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                  }
                }
              }

              if (minX >= maxX || minY >= maxY) {
                minX = 0; minY = 0; maxX = img.width; maxY = img.height;
              }

              const trimWidth = Math.max(1, maxX - minX + 1);
              const trimHeight = Math.max(1, maxY - minY + 1);

              const trimCanvas = document.createElement('canvas');
              trimCanvas.width = trimWidth;
              trimCanvas.height = trimHeight;
              const trimCtx = trimCanvas.getContext('2d');
              trimCtx.drawImage(img, minX, minY, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);

              previews.push({
                origName: file.name,
                origW: img.width,
                origH: img.height,
                trimW: trimWidth,
                trimH: trimHeight,
                dataUrl: trimCanvas.toDataURL('image/png')
              });
              resolve();
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
      }

      if (isMounted) setTrimmedPreviews(previews);
    };

    processPreviews();
    return () => { isMounted = false; };
  }, [files, tolerance]);

  const mergeToPdf = async () => {
    if (trimmedPreviews.length === 0) return;
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.create();

      for (let prev of trimmedPreviews) {
        const pngImage = await pdfDoc.embedPng(prev.dataUrl);

        let pdfW, pdfH;
        if (pageSize === 'a4') {
          pdfW = 595.28; pdfH = 841.89; // A4 pt
        } else if (pageSize === 'letter') {
          pdfW = 612.00; pdfH = 792.00; // Letter pt
        } else {
          // Auto fit image dimensions + margins
          pdfW = prev.trimW + pageMargin * 2;
          pdfH = prev.trimH + pageMargin * 2;
        }

        const page = pdfDoc.addPage([pdfW, pdfH]);
        const availW = pdfW - pageMargin * 2;
        const availH = pdfH - pageMargin * 2;

        const scale = Math.min(availW / prev.trimW, availH / prev.trimH);
        const drawW = prev.trimW * scale;
        const drawH = prev.trimH * scale;

        const x = (pdfW - drawW) / 2;
        const y = (pdfH - drawH) / 2;

        page.drawImage(pngImage, { x, y, width: drawW, height: drawH });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, 'trimmed_images_merged.pdf');
    } catch (err) {
      alert(`Error generating PDF: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="png"
        title="Margin Trimmer & PDF Merger"
        description="Auto-crop white or transparent borders around images with tolerance control, then merge all trimmed images into a single PDF document."
        workInstruction={`1. Click 'Select PNG Images' to import pictures.\n2. Adjust Margin Crop Tolerance (0 to 50) to fine-tune auto-trimming.\n3. Configure target PDF Page Size (Auto, A4, Letter) and Margins.\n4. Click 'Merge Trimmed Images into PDF' to download final document.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        {/* Controls */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crop size={18} style={{ color: '#34d399' }} /> Image Import & Trimming Settings
          </h3>

          <div className="form-group">
            <label className="btn btn-primary">
              <Upload size={16} /> Select PNG Images
              <input type="file" multiple accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handleFiles} />
            </label>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {files.length} file(s) selected
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

          <div className="form-group">
            <label className="form-label">Margin Crop Tolerance ({tolerance}):</label>
            <input
              type="range"
              min="0"
              max="50"
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              0 = Strict white/alpha cutoff | 50 = Higher sensitivity auto-trim
            </span>
          </div>

          <div className="grid-2" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">Target PDF Page Format:</label>
              <select className="form-select" value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
                <option value="auto">Auto (Fit Image Size)</option>
                <option value="a4">Standard A4</option>
                <option value="letter">US Letter</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Page Margin (pt):</label>
              <select className="form-select" value={pageMargin} onChange={(e) => setPageMargin(Number(e.target.value))}>
                <option value={0}>0 pt (No Margin)</option>
                <option value={10}>10 pt</option>
                <option value={20}>20 pt</option>
                <option value={36}>36 pt (0.5 inch)</option>
              </select>
            </div>
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={trimmedPreviews.length === 0 || isProcessing}
            onClick={mergeToPdf}
          >
            <Download size={16} /> Merge Trimmed Images into PDF
          </button>
        </div>

        {/* Previews */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: '#60a5fa' }} /> Trimmed Image Previews ({trimmedPreviews.length})
          </h3>

          <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {trimmedPreviews.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No images loaded.
              </div>
            ) : (
              trimmedPreviews.map((prev, idx) => (
                <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={prev.dataUrl} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'contain', background: '#fff', borderRadius: '4px' }} />
                  <div style={{ flexGrow: 1, fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>{prev.origName}</div>
                    <div style={{ color: 'var(--text-muted)' }}>Original: {prev.origW} x {prev.origH} px</div>
                    <div style={{ color: '#34d399', fontWeight: 600 }}>Trimmed: {prev.trimW} x {prev.trimH} px</div>
                  </div>
                  <span className="badge badge-png"><Check size={12} /> Trimmed</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
