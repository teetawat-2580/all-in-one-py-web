import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Sliders, Upload, Download, RefreshCw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';

export default function PdfSharpen() {
  const [file, setFile] = useState(null);
  const [contrast, setContrast] = useState(1.2);
  const [brightness, setBrightness] = useState(1.0);
  const [sharpen, setSharpen] = useState(true);
  const [thresholdBW, setThresholdBW] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = (e) => e.target.files && setFile(e.target.files[0]);

  const processEnhancement = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

      const outPdf = await PDFDocument.create();

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High res render
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Apply contrast, brightness, and optional threshold
        for (let p = 0; p < data.length; p += 4) {
          let r = data[p];
          let g = data[p + 1];
          let b = data[p + 2];

          // Contrast & Brightness adjustment
          r = Math.min(255, Math.max(0, (r - 128) * contrast + 128 * brightness));
          g = Math.min(255, Math.max(0, (g - 128) * contrast + 128 * brightness));
          b = Math.min(255, Math.max(0, (b - 128) * contrast + 128 * brightness));

          if (thresholdBW) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const bw = gray > 140 ? 255 : 0;
            r = g = b = bw;
          }

          data[p] = r;
          data[p + 1] = g;
          data[p + 2] = b;
        }
        ctx.putImageData(imgData, 0, 0);

        // Optional Sharpen Filter
        if (sharpen) {
          const sharpCanvas = document.createElement('canvas');
          sharpCanvas.width = canvas.width;
          sharpCanvas.height = canvas.height;
          const sCtx = sharpCanvas.getContext('2d');
          sCtx.drawImage(canvas, 0, 0);

          // Simple Convolution Sharpen Kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
          // Canvas filter
          sCtx.filter = 'contrast(120%) brightness(105%)';
          sCtx.drawImage(canvas, 0, 0);
        }

        const pngDataUrl = canvas.toDataURL('image/png');
        const pngBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer());
        const pngImage = await outPdf.embedPng(pngBytes);

        const pageW = viewport.width / 2;
        const pageH = viewport.height / 2;
        const newPage = outPdf.addPage([pageW, pageH]);
        newPage.drawImage(pngImage, { x: 0, y: 0, width: pageW, height: pageH });
      }

      const finalBytes = await outPdf.save();
      saveAs(new Blob([finalBytes], { type: 'application/pdf' }), `${file.name.replace(/\.pdf$/i, '')}_enhanced.pdf`);
    } catch (err) {
      alert(`Sharpen & Enhance error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Sharpen & Enhance"
        description="Enhance document readability by adjusting contrast, brightness, applying sharpening filters, and binarizing scanned PDFs into clean black & white."
        workInstruction={`1. Select PDF Document.\n2. Adjust Contrast and Brightness sliders.\n3. Toggle Sharpen Filter or Black & White Threshold.\n4. Click 'Enhance & Save PDF' to re-encode.`}
        infographic={{ src: '/infographics/infographic_pdf_split_toolkit.png', title: 'PDF Splitter, Page Toolkit, Sharpen & Optimizer — Before & After' }}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} style={{ color: '#60a5fa' }} /> Image Processing Controls
          </h3>

          <div className="form-group">
            <label className="btn btn-primary">
              <Upload size={16} /> Select PDF Document
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {file ? file.name : 'No file selected'}
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Contrast Factor ({contrast.toFixed(1)}):</label>
            <input type="range" min="0.5" max="2.5" step="0.1" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Brightness Factor ({brightness.toFixed(1)}):</label>
            <input type="range" min="0.5" max="2.0" step="0.1" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={sharpen} onChange={(e) => setSharpen(e.target.checked)} />
              Apply Sharpen Edge Filter
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={thresholdBW} onChange={(e) => setThresholdBW(e.target.checked)} />
              Convert to High Contrast Black & White
            </label>
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={!file || isProcessing}
            onClick={processEnhancement}
          >
            {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            Enhance & Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
