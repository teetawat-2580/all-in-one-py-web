import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { BookOpen, Upload, Download, RefreshCw } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function PdfColoringBooks() {
  const [images, setImages] = useState([]);
  const [bookTitle, setBookTitle] = useState('My 20-Page Coloring Book');
  const [includeBlankBacks, setIncludeBlankBacks] = useState(true);
  const [addPageNumbers, setAddPageNumbers] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImages = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files).slice(0, 20); // max 20 pages
      setImages(filesArr);
    }
  };

  const generateColoringBook = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);

    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Page dimensions: Standard A4
      const pdfW = 595.28;
      const pdfH = 841.89;
      const margin = 36; // 0.5 inch

      // 1. Cover / Title Page
      const titlePage = pdfDoc.addPage([pdfW, pdfH]);
      titlePage.drawRectangle({
        x: margin,
        y: margin,
        width: pdfW - margin * 2,
        height: pdfH - margin * 2,
        borderWidth: 3,
        borderColor: rgb(0.2, 0.2, 0.2),
      });

      const titleWidth = font.widthOfTextAtSize(bookTitle, 28);
      titlePage.drawText(bookTitle, {
        x: (pdfW - titleWidth) / 2,
        y: pdfH - 200,
        size: 28,
        font: font,
        color: rgb(0.1, 0.1, 0.1),
      });

      const subStr = `Collection of ${images.length} Coloring Pages`;
      const subWidth = fontRegular.widthOfTextAtSize(subStr, 16);
      titlePage.drawText(subStr, {
        x: (pdfW - subWidth) / 2,
        y: pdfH - 250,
        size: 16,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });

      if (includeBlankBacks) {
        pdfDoc.addPage([pdfW, pdfH]); // Blank back of title page
      }

      // 2. Add Coloring Pages
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const bytes = await file.arrayBuffer();
        const img = file.type === 'image/png' || file.name.endsWith('.png') ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

        const page = pdfDoc.addPage([pdfW, pdfH]);

        // Draw border
        page.drawRectangle({
          x: margin,
          y: margin,
          width: pdfW - margin * 2,
          height: pdfH - margin * 2,
          borderWidth: 1.5,
          borderColor: rgb(0.3, 0.3, 0.3),
        });

        // Fit image inside margins
        const availW = pdfW - margin * 4;
        const availH = pdfH - margin * 4 - 30; // leave space for page number
        const scale = Math.min(availW / img.width, availH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;

        const x = (pdfW - drawW) / 2;
        const y = (pdfH - drawH) / 2 + 15;

        page.drawImage(img, { x, y, width: drawW, height: drawH });

        // Add page number at bottom
        if (addPageNumbers) {
          const pStr = `Page ${i + 1} of ${images.length}`;
          const pWidth = fontRegular.widthOfTextAtSize(pStr, 10);
          page.drawText(pStr, {
            x: (pdfW - pWidth) / 2,
            y: margin + 10,
            size: 10,
            font: fontRegular,
            color: rgb(0.5, 0.5, 0.5),
          });
        }

        // Add blank back page if double-sided option is checked
        if (includeBlankBacks) {
          pdfDoc.addPage([pdfW, pdfH]);
        }
      }

      const pdfBytes = await pdfDoc.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `${bookTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      alert(`Coloring book generation error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Coloring books 20 pages"
        description="Automatically compile up to 20 line art drawings or coloring pages into a ready-to-print 20-page coloring book PDF document."
        workInstruction={`1. Upload up to 20 line art image pages.\n2. Set Book Title, Page Numbering, and Blank Backing Page options.\n3. Click 'Generate 20-Page Coloring Book PDF' to create book.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} style={{ color: '#34d399' }} /> Coloring Book Setup
          </h3>

          <div className="form-group">
            <label className="btn btn-primary">
              <Upload size={16} /> Select Coloring Pages (Max 20)
              <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImages} />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {images.length} page(s) loaded (Max 20)
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Coloring Book Title:</label>
            <input type="text" className="form-input" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={includeBlankBacks} onChange={(e) => setIncludeBlankBacks(e.target.checked)} />
              Include Blank Back Pages (Prevents marker bleed in double-sided printing)
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={addPageNumbers} onChange={(e) => setAddPageNumbers(e.target.checked)} />
              Add Footer Page Numbers (Page X of 20)
            </label>
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={images.length === 0 || isGenerating}
            onClick={generateColoringBook}
          >
            {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            Generate Coloring Book PDF
          </button>
        </div>
      </div>
    </div>
  );
}
