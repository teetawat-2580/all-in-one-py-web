import React, { useState, useEffect, useRef } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Eye, Upload, Trash2, ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDFjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

export default function PdfViewer() {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedFileIdx, setSelectedFileIdx] = useState(null);
  const [activePdfDoc, setActivePdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [pageMeta, setPageMeta] = useState(null);

  const canvasRef = useRef(null);

  const handlePdfUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);

    const processed = [];
    for (let file of newFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;

        let dimensions = 'N/A';
        let ratioStr = 'N/A';
        if (numPages > 0) {
          const firstPage = await pdfDoc.getPage(1);
          const viewport = firstPage.getViewport({ scale: 1.0 });
          const w = Math.round(viewport.width);
          const h = Math.round(viewport.height);
          dimensions = `${w} x ${h} pt (${(w / 72 * 25.4).toFixed(1)} x ${(h / 72 * 25.4).toFixed(1)} mm)`;
          const ratio = w / h;
          ratioStr = ratio < 1 ? `1 : ${(1 / ratio).toFixed(2)}` : `${ratio.toFixed(2)} : 1`;
        }

        processed.push({
          file,
          name: file.name,
          sizeKb: (file.size / 1024).toFixed(2),
          numPages,
          dimensions,
          ratioStr,
          arrayBuffer
        });
      } catch (err) {
        alert(`Failed to load ${file.name}: ${err.message}`);
      }
    }

    setPdfFiles(prev => [...prev, ...processed]);
    if (selectedFileIdx === null && processed.length > 0) {
      loadPdfDoc(processed[0]);
      setSelectedFileIdx(pdfFiles.length);
    }
  };

  const loadPdfDoc = async (item) => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: item.arrayBuffer });
      const doc = await loadingTask.promise;
      setActivePdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!activePdfDoc || !canvasRef.current) return;

    let isMounted = true;
    const renderCurrentPage = async () => {
      try {
        const page = await activePdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.2 });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        await page.render(renderContext).promise;

        // Page Text Extraction
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');
        if (isMounted) {
          setExtractedText(text);
          setPageMeta({
            widthPt: Math.round(viewport.width / 1.2),
            heightPt: Math.round(viewport.height / 1.2),
            rotation: page.rotate || 0
          });
        }
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderCurrentPage();
    return () => { isMounted = false; };
  }, [activePdfDoc, currentPage]);

  const selectRow = (idx) => {
    setSelectedFileIdx(idx);
    loadPdfDoc(pdfFiles[idx]);
  };

  const clearList = () => {
    setPdfFiles([]);
    setSelectedFileIdx(null);
    setActivePdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setExtractedText('');
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Viewer & Inspector"
        description="Inspect metadata, page counts, page dimensions, and aspect ratio of PDF files, and interactively preview pages."
        workInstruction={`1. Click 'Select PDF File(s)' to import PDF documents into the inspector table.\n2. Select any file row in the list to inspect its size, page count, and aspect ratio.\n3. Click 'Preview Selected PDF' or navigate pages using 'Previous' and 'Next' controls.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        {/* Left: Document Table */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#34d399' }} /> PDF Document List
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label className="btn btn-primary btn-sm">
                <Upload size={14} /> Select PDF File(s)
                <input type="file" multiple accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
              </label>
              {pdfFiles.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={clearList}>
                  <Trash2 size={14} /> Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size (KB)</th>
                  <th>Pages</th>
                  <th>Dimensions</th>
                  <th>Aspect Ratio</th>
                </tr>
              </thead>
              <tbody>
                {pdfFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                      No PDF files imported yet.
                    </td>
                  </tr>
                ) : (
                  pdfFiles.map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => selectRow(idx)}
                      style={{
                        cursor: 'pointer',
                        background: selectedFileIdx === idx ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                        fontWeight: selectedFileIdx === idx ? 600 : 400
                      }}
                    >
                      <td style={{ color: '#60a5fa' }}>{item.name}</td>
                      <td>{item.sizeKb} KB</td>
                      <td>{item.numPages}</td>
                      <td style={{ fontSize: '11px' }}>{item.dimensions}</td>
                      <td>{item.ratioStr}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pageMeta && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', fontSize: '13px' }}>
              <div style={{ fontWeight: 600, color: '#34d399', marginBottom: '4px' }}>Page {currentPage} Inspector Details:</div>
              <div>Width: {pageMeta.widthPt} pt ({(pageMeta.widthPt / 72 * 25.4).toFixed(1)} mm)</div>
              <div>Height: {pageMeta.heightPt} pt ({(pageMeta.heightPt / 72 * 25.4).toFixed(1)} mm)</div>
              <div>Rotation: {pageMeta.rotation}°</div>
            </div>
          )}
        </div>

        {/* Right: Page Previewer & Text Extractor */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} style={{ color: '#60a5fa' }} /> Interactive Page Viewer
            </h3>

            {activePdfDoc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', padding: '12px', minHeight: '300px', maxHeight: '400px', overflow: 'auto' }}>
            {!activePdfDoc ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Select a PDF file to preview pages</span>
            ) : (
              <canvas ref={canvasRef} style={{ border: '1px solid var(--border-color)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', maxWidth: '100%' }} />
            )}
          </div>

          {/* Text preview */}
          {extractedText && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Extracted Text (Page {currentPage}):
              </div>
              <textarea
                className="form-textarea"
                rows={3}
                readOnly
                value={extractedText}
                style={{ fontSize: '12px' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
