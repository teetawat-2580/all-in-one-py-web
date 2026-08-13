import React, { useState, useRef, useEffect } from 'react';
import InfoHeader from '../common/InfoHeader';
import { BookOpen, Upload, Download, RefreshCw, Link, Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

export default function PdfCoverAdder() {
  // Books dict: {name: {file, arrayBuffer}}
  const [books, setBooks] = useState({});
  const [bookChecked, setBookChecked] = useState({});

  // Covers dict: {name: {file, arrayBuffer, numPages, currentPage}}
  const [covers, setCovers] = useState({});
  const [coverChecked, setCoverChecked] = useState({});

  // Pairing queue: [{bookName, coverName, coverPage}]
  const [pairs, setPairs] = useState([]);

  // Preview state
  const [previewType, setPreviewType] = useState(null); // 'book' | 'cover'
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewPageNum, setPreviewPageNum] = useState(0);
  const [previewTotalPages, setPreviewTotalPages] = useState(0);
  const [previewName, setPreviewName] = useState('');
  const [activeCoverPage, setActiveCoverPage] = useState({}); // {coverName: pageIdx}

  const [isProcessing, setIsProcessing] = useState(false);

  const previewCanvasRef = useRef(null);

  // Render preview on canvas
  const renderPreview = async (arrayBuffer, pageIdx, totalPages) => {
    try {
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await doc.getPage(Math.min(pageIdx + 1, doc.numPages));
      const viewport = page.getViewport({ scale: 0.8 });
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error('Preview render error:', err);
    }
  };

  // Preview a book
  const previewBook = async (name) => {
    const entry = books[name];
    if (!entry) return;
    setPreviewType('book');
    setPreviewTitle(`Book: ${name}`);
    setPreviewName(name);
    const doc = await pdfjsLib.getDocument({ data: entry.arrayBuffer }).promise;
    setPreviewPageNum(0);
    setPreviewTotalPages(doc.numPages);
    await renderPreview(entry.arrayBuffer, 0, doc.numPages);
  };

  // Preview a cover
  const previewCover = async (name, pageIdx) => {
    const entry = covers[name];
    if (!entry) return;
    setPreviewType('cover');
    setPreviewTitle(`Cover: ${name}`);
    setPreviewName(name);
    const doc = await pdfjsLib.getDocument({ data: entry.arrayBuffer }).promise;
    const pg = pageIdx !== undefined ? pageIdx : (activeCoverPage[name] || 0);
    setPreviewPageNum(pg);
    setPreviewTotalPages(doc.numPages);
    setActiveCoverPage(prev => ({ ...prev, [name]: pg }));
    await renderPreview(entry.arrayBuffer, pg, doc.numPages);
  };

  // Navigate preview pages
  const prevPreviewPage = () => {
    if (previewType === 'cover' && previewPageNum > 0) {
      const newPage = previewPageNum - 1;
      setPreviewPageNum(newPage);
      setActiveCoverPage(prev => ({ ...prev, [previewName]: newPage }));
      const entry = covers[previewName];
      if (entry) renderPreview(entry.arrayBuffer, newPage, previewTotalPages);
    }
  };

  const nextPreviewPage = () => {
    if (previewType === 'cover' && previewPageNum < previewTotalPages - 1) {
      const newPage = previewPageNum + 1;
      setPreviewPageNum(newPage);
      setActiveCoverPage(prev => ({ ...prev, [previewName]: newPage }));
      const entry = covers[previewName];
      if (entry) renderPreview(entry.arrayBuffer, newPage, previewTotalPages);
    }
  };

  // Add books
  const handleAddBooks = async (e) => {
    if (!e.target.files) return;
    const newBooks = { ...books };
    const newChecked = { ...bookChecked };
    for (let f of Array.from(e.target.files)) {
      if (!newBooks[f.name]) {
        const buf = await f.arrayBuffer();
        newBooks[f.name] = { file: f, arrayBuffer: buf };
        newChecked[f.name] = false;
      }
    }
    setBooks(newBooks);
    setBookChecked(newChecked);
  };

  // Add covers (PDF or image)
  const handleAddCovers = async (e) => {
    if (!e.target.files) return;
    const newCovers = { ...covers };
    const newChecked = { ...coverChecked };
    for (let f of Array.from(e.target.files)) {
      if (!newCovers[f.name]) {
        const buf = await f.arrayBuffer();
        let numPages = 1;
        if (f.name.endsWith('.pdf') || f.type === 'application/pdf') {
          try {
            const doc = await pdfjsLib.getDocument({ data: buf }).promise;
            numPages = doc.numPages;
          } catch {}
        }
        newCovers[f.name] = { file: f, arrayBuffer: buf, numPages };
        newChecked[f.name] = false;
      }
    }
    setCovers(newCovers);
    setCoverChecked(newChecked);
  };

  // Link checked files into pairing queue
  const linkChecked = () => {
    const checkedBooks = Object.keys(bookChecked).filter(n => bookChecked[n]);
    const checkedCovers = Object.keys(coverChecked).filter(n => coverChecked[n]);

    if (checkedBooks.length === 0) { alert('Please check at least one Target Book.'); return; }
    if (checkedCovers.length !== 1) { alert('Please check exactly ONE Cover to pair.'); return; }

    const coverName = checkedCovers[0];
    const coverPage = activeCoverPage[coverName] || 0;

    const newPairs = [...pairs];
    for (let bookName of checkedBooks) {
      newPairs.push({ bookName, coverName, coverPage });
    }
    setPairs(newPairs);

    // Uncheck all
    setBookChecked(prev => Object.fromEntries(Object.keys(prev).map(k => [k, false])));
    setCoverChecked(prev => Object.fromEntries(Object.keys(prev).map(k => [k, false])));
  };

  // Remove a pair from queue
  const removePair = (idx) => {
    setPairs(prev => prev.filter((_, i) => i !== idx));
  };

  // Generate paired PDFs
  const generatePairedPdfs = async () => {
    if (pairs.length === 0) { alert('Queue is empty. Check files and click "Link Checked Files" first.'); return; }
    setIsProcessing(true);

    const zip = new JSZip();
    try {
      for (let pair of pairs) {
        const bookEntry = books[pair.bookName];
        const coverEntry = covers[pair.coverName];
        if (!bookEntry || !coverEntry) continue;

        const outPdf = await PDFDocument.create();

        // Insert cover page first (at position 0)
        const coverFile = coverEntry.file;
        if (coverFile.name.endsWith('.pdf') || coverFile.type === 'application/pdf') {
          const coverPdf = await PDFDocument.load(coverEntry.arrayBuffer);
          const pageIdx = Math.min(pair.coverPage, coverPdf.getPageCount() - 1);
          const [copiedPage] = await outPdf.copyPages(coverPdf, [pageIdx]);
          outPdf.addPage(copiedPage);
        } else {
          // Image cover
          const imgBytes = coverEntry.arrayBuffer;
          let img;
          if (coverFile.name.endsWith('.png')) {
            img = await outPdf.embedPng(imgBytes);
          } else {
            img = await outPdf.embedJpg(imgBytes);
          }
          const page = outPdf.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }

        // Copy all book pages after cover
        const bookPdf = await PDFDocument.load(bookEntry.arrayBuffer);
        const bookPages = await outPdf.copyPages(bookPdf, bookPdf.getPageIndices());
        bookPages.forEach(p => outPdf.addPage(p));

        const pdfBytes = await outPdf.save();
        const outName = pair.bookName.replace(/\.pdf$/i, '') + '_added_cover.pdf';
        zip.file(outName, pdfBytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'paired_pdfs_with_covers.zip');
      setPairs([]); // Clear queue after success
    } catch (err) {
      alert(`Generation error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Advanced Cover Adder"
        description="Prepend a custom front cover page to multiple target PDF documents using an interactive pairing queue and live page preview."
        workInstruction={`1. Click '+ Add Books' to add target PDF documents and '+ Add Covers' to add cover PDFs.\n2. Select a file and click 'Preview' (use << >> to select specific cover pages if multi-page).\n3. Check target book(s) and exactly ONE cover, click '🔗 LINK CHECKED FILES', then click 'GENERATE PAIRED PDFs'.`}
        infographic={{ src: '/infographics/infographic_pdf_cover_overlay.png', title: 'Cover Adder, Overlay, Vectorizer & Coloring Books — Before & After' }}
      />

      {/* Top 3-Column Layout: Books | Preview | Covers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px 1fr', gap: '14px', marginBottom: '16px' }}>

        {/* 1. Left: Target Books */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>1. Check Target Books</h3>
            <label className="btn btn-primary btn-sm">
              <Plus size={13} /> Add Books
              <input type="file" multiple accept="application/pdf" style={{ display: 'none' }} onChange={handleAddBooks} />
            </label>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {Object.keys(books).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>No books added</div>
            ) : Object.keys(books).map(name => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <input type="checkbox" checked={bookChecked[name] || false} onChange={e => setBookChecked(prev => ({ ...prev, [name]: e.target.checked }))} />
                <span style={{ flexGrow: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</span>
                <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => previewBook(name)}>Preview</button>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Center: Preview Area */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: 8, color: '#34d399', textAlign: 'center', minHeight: 20 }}>{previewTitle || 'Preview Area'}</div>

          <div style={{ width: '100%', flexGrow: 1, background: '#0f172a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220, overflow: 'hidden' }}>
            {!previewType ? (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click 'Preview' next to a file</span>
            ) : (
              <canvas ref={previewCanvasRef} style={{ maxWidth: '100%', maxHeight: '220px', border: '1px solid var(--border-color)' }} />
            )}
          </div>

          {/* Page navigation for cover */}
          {previewType === 'cover' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={previewPageNum <= 0} onClick={prevPreviewPage}><ChevronLeft size={13} /></button>
              <span style={{ fontSize: 12 }}>Cover Page: {previewPageNum + 1} / {previewTotalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={previewPageNum >= previewTotalPages - 1} onClick={nextPreviewPage}><ChevronRight size={13} /></button>
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 12, fontSize: 13 }}
            onClick={linkChecked}
          >
            <Link size={14} /> 🔗 LINK CHECKED FILES
          </button>
        </div>

        {/* 3. Right: Cover PDFs */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>2. Check ONE Cover</h3>
            <label className="btn btn-primary btn-sm">
              <Plus size={13} /> Add Covers
              <input type="file" multiple accept="application/pdf,image/png,image/jpeg" style={{ display: 'none' }} onChange={handleAddCovers} />
            </label>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {Object.keys(covers).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>No covers added</div>
            ) : Object.keys(covers).map(name => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <input type="checkbox" checked={coverChecked[name] || false}
                  onChange={e => {
                    // Only allow one cover checked at a time
                    const newChecked = Object.fromEntries(Object.keys(coverChecked).map(k => [k, false]));
                    newChecked[name] = e.target.checked;
                    setCoverChecked(newChecked);
                  }}
                />
                <span style={{ flexGrow: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</span>
                <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => previewCover(name)}>Preview</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pairing Queue Table */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700 }}>3. Pairing Queue</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Target Book</th>
                <th>Cover File</th>
                <th>Cover Page No.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pairs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                    No pairs linked yet. Check books & cover, then click 🔗 LINK CHECKED FILES.
                  </td>
                </tr>
              ) : pairs.map((pair, idx) => (
                <tr key={idx}>
                  <td style={{ color: '#60a5fa' }}>{pair.bookName}</td>
                  <td style={{ color: '#34d399' }}>{pair.coverName}</td>
                  <td style={{ textAlign: 'center' }}>Page {pair.coverPage + 1}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => removePair(idx)}>
                      <Trash2 size={12} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Button */}
      <button
        className="btn btn-success btn-lg"
        style={{ width: '100%' }}
        disabled={pairs.length === 0 || isProcessing}
        onClick={generatePairedPdfs}
      >
        {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
        {isProcessing ? 'Generating Paired PDFs...' : `GENERATE PAIRED PDFs (${pairs.length} in queue)`}
      </button>
    </div>
  );
}
