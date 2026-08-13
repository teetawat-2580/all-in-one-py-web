import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Layers, Upload, Download, RefreshCw, RotateCw, Trash2, Maximize, FileImage, Plus } from 'lucide-react';
import { PDFDocument, degrees, PageSizes } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function PdfPageToolkit() {
  const [subAction, setSubAction] = useState('merge'); // merge, pdf2png, remove, rotate, resize
  const [files, setFiles] = useState([]);
  const [rotationAngle, setRotationAngle] = useState(90);
  const [removeRange, setRemoveRange] = useState('1');
  const [dpi, setDpi] = useState(150);
  const [targetSize, setTargetSize] = useState('A4'); // A4, Letter, Legal
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  // 1. Merge PDFs
  const executeMerge = async () => {
    if (files.length < 2) {
      alert('Please select at least 2 PDF files to merge.');
      return;
    }
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (let f of files) {
        const buffer = await f.arrayBuffer();
        const pdf = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }
      const pdfBytes = await mergedPdf.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'merged_document.pdf');
    } catch (err) {
      alert(`Merge error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. PDF to PNG
  const executePdfToPng = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    const zip = new JSZip();

    try {
      for (let f of files) {
        const buffer = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const scale = dpi / 72;
        const baseName = f.name.replace(/\.pdf$/i, '');

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;

          await new Promise((resolve) => {
            canvas.toBlob((blob) => {
              zip.file(`${baseName}_page_${i}.png`, blob);
              resolve();
            }, 'image/png');
          });
        }
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, 'pdf_pages_images.zip');
    } catch (err) {
      alert(`PDF to PNG error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Remove Pages
  const executeRemovePages = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const pdf = await PDFDocument.load(buffer);
      const total = pdf.getPageCount();

      const toRemove = new Set();
      removeRange.split(',').forEach(p => {
        p = p.trim();
        if (p.includes('-')) {
          const [s, e] = p.split('-').map(Number);
          for (let i = s; i <= e; i++) if (i >= 1 && i <= total) toRemove.add(i - 1);
        } else {
          const num = Number(p);
          if (num >= 1 && num <= total) toRemove.add(num - 1);
        }
      });

      const newPdf = await PDFDocument.create();
      for (let i = 0; i < total; i++) {
        if (!toRemove.has(i)) {
          const [page] = await newPdf.copyPages(pdf, [i]);
          newPdf.addPage(page);
        }
      }

      const pdfBytes = await newPdf.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `${f.name.replace(/\.pdf$/i, '')}_pages_removed.pdf`);
    } catch (err) {
      alert(`Remove pages error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Rotate Pages
  const executeRotate = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const pdf = await PDFDocument.load(buffer);
      const pages = pdf.getPages();

      pages.forEach(p => {
        const currentRot = p.getRotation().angle;
        p.setRotation(degrees((currentRot + Number(rotationAngle)) % 360));
      });

      const pdfBytes = await pdf.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `${f.name.replace(/\.pdf$/i, '')}_rotated.pdf`);
    } catch (err) {
      alert(`Rotate pages error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Resize Pages
  const executeResize = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const pdf = await PDFDocument.load(buffer);

      let targetW = PageSizes.A4[0], targetH = PageSizes.A4[1];
      if (targetSize === 'Letter') { targetW = PageSizes.Letter[0]; targetH = PageSizes.Letter[1]; }
      else if (targetSize === 'Legal') { targetW = PageSizes.Legal[0]; targetH = PageSizes.Legal[1]; }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, pdf.getPageIndices());

      copiedPages.forEach(page => {
        const { width, height } = page.getSize();
        const newPage = newPdf.addPage([targetW, targetH]);
        const scale = Math.min(targetW / width, targetH / height);
        newPage.drawPage(page, {
          x: (targetW - width * scale) / 2,
          y: (targetH - height * scale) / 2,
          xScale: scale,
          yScale: scale
        });
      });

      const pdfBytes = await newPdf.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `${f.name.replace(/\.pdf$/i, '')}_resized.pdf`);
    } catch (err) {
      alert(`Resize pages error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Page Toolkit (Merge / PDF to PNG / Remove / Rotate / Resize)"
        description="Comprehensive toolkit to combine multiple PDFs, export pages to PNG, remove unwanted pages, rotate orientations, and standardize page sizes."
        workInstruction={`1. Choose Action from sub-navigation (Merge, PDF to PNG, Remove Pages, Rotate Pages, Resize Pages).\n2. Import target PDF file(s).\n3. Adjust action-specific settings (DPI, ranges, angles, page size presets).\n4. Click Process action button to download result.`}
      />

      <div className="subtab-nav">
        <button className={`subtab-btn ${subAction === 'merge' ? 'active' : ''}`} onClick={() => setSubAction('merge')}>
          <Plus size={14} /> Merge PDFs
        </button>
        <button className={`subtab-btn ${subAction === 'pdf2png' ? 'active' : ''}`} onClick={() => setSubAction('pdf2png')}>
          <FileImage size={14} /> PDF to PNG
        </button>
        <button className={`subtab-btn ${subAction === 'remove' ? 'active' : ''}`} onClick={() => setSubAction('remove')}>
          <Trash2 size={14} /> Remove Pages
        </button>
        <button className={`subtab-btn ${subAction === 'rotate' ? 'active' : ''}`} onClick={() => setSubAction('rotate')}>
          <RotateCw size={14} /> Rotate Pages
        </button>
        <button className={`subtab-btn ${subAction === 'resize' ? 'active' : ''}`} onClick={() => setSubAction('resize')}>
          <Maximize size={14} /> Resize Pages
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div className="form-group">
          <label className="btn btn-primary">
            <Upload size={16} /> Select PDF Document(s)
            <input type="file" multiple={subAction === 'merge' || subAction === 'pdf2png'} accept="application/pdf" style={{ display: 'none' }} onChange={handleFiles} />
          </label>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {files.length > 0 ? `${files.length} PDF file(s) selected: ${files.map(f => f.name).join(', ')}` : 'No files selected'}
          </span>
        </div>

        {subAction === 'pdf2png' && (
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Render Resolution DPI:</label>
            <select className="form-select" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
              <option value={72}>72 DPI (Standard Web)</option>
              <option value={150}>150 DPI (Medium Quality)</option>
              <option value={300}>300 DPI (High Print Quality)</option>
            </select>
          </div>
        )}

        {subAction === 'remove' && (
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Page Range(s) to Remove (e.g. 1, 3-5):</label>
            <input type="text" className="form-input" value={removeRange} onChange={(e) => setRemoveRange(e.target.value)} />
          </div>
        )}

        {subAction === 'rotate' && (
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Rotation Angle:</label>
            <select className="form-select" value={rotationAngle} onChange={(e) => setRotationAngle(Number(e.target.value))}>
              <option value={90}>Rotate 90° Clockwise</option>
              <option value={180}>Rotate 180° Flip</option>
              <option value={270}>Rotate 270° Counter-Clockwise</option>
            </select>
          </div>
        )}

        {subAction === 'resize' && (
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Target Page Format:</label>
            <select className="form-select" value={targetSize} onChange={(e) => setTargetSize(e.target.value)}>
              <option value="A4">Standard A4 (210 x 297 mm)</option>
              <option value="Letter">US Letter (8.5 x 11 in)</option>
              <option value="Legal">US Legal (8.5 x 14 in)</option>
            </select>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          {subAction === 'merge' && (
            <button className="btn btn-success" disabled={files.length < 2 || isProcessing} onClick={executeMerge}>
              {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} Merge All PDFs
            </button>
          )}
          {subAction === 'pdf2png' && (
            <button className="btn btn-success" disabled={files.length === 0 || isProcessing} onClick={executePdfToPng}>
              {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} Convert Pages to PNG (.ZIP)
            </button>
          )}
          {subAction === 'remove' && (
            <button className="btn btn-danger" disabled={files.length === 0 || isProcessing} onClick={executeRemovePages}>
              {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} Delete Selected Pages
            </button>
          )}
          {subAction === 'rotate' && (
            <button className="btn btn-success" disabled={files.length === 0 || isProcessing} onClick={executeRotate}>
              {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} Rotate PDF Pages
            </button>
          )}
          {subAction === 'resize' && (
            <button className="btn btn-success" disabled={files.length === 0 || isProcessing} onClick={executeResize}>
              {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} Resize PDF Pages
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
