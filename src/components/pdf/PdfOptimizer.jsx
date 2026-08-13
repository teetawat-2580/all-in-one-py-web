import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Minimize2, Upload, Download, RefreshCw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';

export default function PdfOptimizer() {
  const [file, setFile] = useState(null);
  const [origSizeKb, setOrigSizeKb] = useState(0);
  const [quality, setQuality] = useState(60); // 10% - 100% JPEG quality
  const [resScale, setResScale] = useState(1.0); // 0.5 to 1.5
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setOrigSizeKb((f.size / 1024).toFixed(2));
    }
  };

  const processOptimization = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const outPdf = await PDFDocument.create();

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: resScale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const jpgDataUrl = canvas.toDataURL('image/jpeg', quality / 100);
        const jpgBytes = await fetch(jpgDataUrl).then(res => res.arrayBuffer());
        const jpgImage = await outPdf.embedJpg(jpgBytes);

        const origViewport = page.getViewport({ scale: 1.0 });
        const newPage = outPdf.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(jpgImage, { x: 0, y: 0, width: origViewport.width, height: origViewport.height });
      }

      const pdfBytes = await outPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, `${file.name.replace(/\.pdf$/i, '')}_optimized.pdf`);
    } catch (err) {
      alert(`Optimizer error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Size Optimizer"
        description="Compress PDF documents by re-encoding embedded raster images with adjustable JPEG quality and resolution scaling."
        workInstruction={`1. Upload PDF Document.\n2. Adjust JPEG Compression Quality slider (10% - 100%).\n3. Adjust Resolution Scale factor (0.5x to 1.5x).\n4. Click 'Compress & Download PDF'.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Minimize2 size={18} style={{ color: '#34d399' }} /> PDF Compression Controls
          </h3>

          <div className="form-group">
            <label className="btn btn-primary">
              <Upload size={16} /> Select PDF Document
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {file ? `${file.name} (${origSizeKb} KB)` : 'No file selected'}
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Image Quality ({quality}%):</label>
            <input type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Resolution Downscale ({resScale}x):</label>
            <input type="range" min="0.5" max="1.5" step="0.1" value={resScale} onChange={(e) => setResScale(Number(e.target.value))} style={{ width: '100%' }} />
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={!file || isProcessing}
            onClick={processOptimization}
          >
            {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            Compress & Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
