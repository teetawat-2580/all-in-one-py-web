import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Scissors, Upload, Download, RefreshCw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function PdfSplitter() {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [splitMode, setSplitMode] = useState('single'); // 'single' | 'range' | 'chunk'
  const [pageRangeStr, setPageRangeStr] = useState('1-3, 5');
  const [chunkSize, setChunkSize] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      try {
        const buffer = await f.arrayBuffer();
        const pdf = await PDFDocument.load(buffer);
        setNumPages(pdf.getPageCount());
      } catch (err) {
        alert(`Failed to load PDF: ${err.message}`);
      }
    }
  };

  const parseRanges = (str, total) => {
    const pages = new Set();
    const parts = str.split(',');
    for (let part of parts) {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (start && end) {
          for (let p = Math.max(1, start); p <= Math.min(total, end); p++) {
            pages.add(p - 1); // 0-indexed
          }
        }
      } else {
        const p = Number(part);
        if (p && p >= 1 && p <= total) {
          pages.add(p - 1);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const executeSplit = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(arrayBuffer);
      const zip = new JSZip();
      const baseName = file.name.replace(/\.pdf$/i, '');

      if (splitMode === 'single') {
        for (let i = 0; i < numPages; i++) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(srcPdf, [i]);
          newPdf.addPage(copiedPage);
          const pdfBytes = await newPdf.save();
          zip.file(`${baseName}_page_${i + 1}.pdf`, pdfBytes);
        }
      } else if (splitMode === 'range') {
        const pageIndices = parseRanges(pageRangeStr, numPages);
        if (pageIndices.length === 0) {
          alert('No valid pages found in range string!');
          setIsProcessing(false);
          return;
        }
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));
        const pdfBytes = await newPdf.save();
        zip.file(`${baseName}_extracted_range.pdf`, pdfBytes);
      } else if (splitMode === 'chunk') {
        let chunkIndex = 1;
        for (let i = 0; i < numPages; i += Number(chunkSize)) {
          const newPdf = await PDFDocument.create();
          const indices = [];
          for (let j = i; j < Math.min(i + Number(chunkSize), numPages); j++) {
            indices.push(j);
          }
          const copiedPages = await newPdf.copyPages(srcPdf, indices);
          copiedPages.forEach(page => newPdf.addPage(page));
          const pdfBytes = await newPdf.save();
          zip.file(`${baseName}_part_${chunkIndex}.pdf`, pdfBytes);
          chunkIndex++;
        }
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `${baseName}_split.zip`);
    } catch (err) {
      alert(`Error splitting PDF: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="PDF Splitter"
        description="Split multi-page PDF documents into individual single-page files, custom page ranges, or fixed chunk sizes."
        workInstruction={`1. Upload a PDF file.\n2. Choose Split Mode (Extract Single Pages, Custom Page Range, or Fixed Chunk Size).\n3. Configure page ranges (e.g., '1-3, 5, 7-10') or chunk sizes (e.g. 5 pages per file).\n4. Click 'Split & Download (.ZIP)' to process.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scissors size={18} style={{ color: '#34d399' }} /> PDF Document Import
          </h3>

          <div className="form-group">
            <label className="btn btn-primary">
              <Upload size={16} /> Select PDF Document
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
            </label>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {file ? `${file.name} (${numPages} pages)` : 'No PDF selected'}
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scissors size={18} style={{ color: '#60a5fa' }} /> Split Options
          </h3>

          <div className="form-group">
            <label className="form-label">Split Mode:</label>
            <select className="form-select" value={splitMode} onChange={(e) => setSplitMode(e.target.value)}>
              <option value="single">Extract Every Page to Separate File (1 page = 1 PDF)</option>
              <option value="range">Extract Specific Page Range (e.g., 1-3, 5)</option>
              <option value="chunk">Split into Fixed Chunks (e.g., 5 pages per PDF)</option>
            </select>
          </div>

          {splitMode === 'range' && (
            <div className="form-group">
              <label className="form-label">Page Ranges (1-{numPages || 'N'}):</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 1-3, 5, 8-10"
                value={pageRangeStr}
                onChange={(e) => setPageRangeStr(e.target.value)}
              />
            </div>
          )}

          {splitMode === 'chunk' && (
            <div className="form-group">
              <label className="form-label">Pages Per Split Chunk:</label>
              <input
                type="number"
                min="1"
                max={numPages || 100}
                className="form-input"
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
              />
            </div>
          )}

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={!file || isProcessing}
            onClick={executeSplit}
          >
            {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {isProcessing ? 'Processing PDF...' : 'Split & Download (.ZIP)'}
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h3 style={{ margin: '0 0 16px 0', width: '100%', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scissors size={18} style={{ color: '#a78bfa' }} /> Split Plan Summary
          </h3>

          {!file ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0' }}>
              Upload a PDF to see split plan summary
            </div>
          ) : (
            <div style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px', fontSize: '13px' }}>
              <div style={{ fontWeight: 600, color: '#34d399', marginBottom: '8px' }}>Document: {file.name}</div>
              <div style={{ marginBottom: '4px' }}>Total Pages: {numPages}</div>
              <div style={{ marginBottom: '4px' }}>Selected Mode: {splitMode.toUpperCase()}</div>
              {splitMode === 'single' && <div style={{ color: '#60a5fa' }}>Will generate {numPages} individual PDF files.</div>}
              {splitMode === 'range' && <div style={{ color: '#60a5fa' }}>Extracting range: {pageRangeStr}</div>}
              {splitMode === 'chunk' && <div style={{ color: '#60a5fa' }}>Will generate ~{Math.ceil(numPages / chunkSize)} PDF chunk files ({chunkSize} pages/file).</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
