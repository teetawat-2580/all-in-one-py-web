import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { BookOpen, Upload, Download, RefreshCw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function PdfCoverAdder() {
  const [docFile, setDocFile] = useState(null);
  const [frontCoverFile, setFrontCoverFile] = useState(null);
  const [backCoverFile, setBackCoverFile] = useState(null);
  const [fitMode, setFitMode] = useState('fitCover'); // fitCover, fitDoc
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDoc = (e) => e.target.files && setDocFile(e.target.files[0]);
  const handleFront = (e) => e.target.files && setFrontCoverFile(e.target.files[0]);
  const handleBack = (e) => e.target.files && setBackCoverFile(e.target.files[0]);

  const embedCoverPage = async (pdfDoc, coverFile, targetWidth, targetHeight) => {
    if (!coverFile) return null;
    const coverBytes = await coverFile.arrayBuffer();

    if (coverFile.type === 'application/pdf' || coverFile.name.endsWith('.pdf')) {
      const coverPdf = await PDFDocument.load(coverBytes);
      const [copiedPage] = await pdfDoc.copyPages(coverPdf, [0]);
      return copiedPage;
    } else {
      let image;
      if (coverFile.type === 'image/png' || coverFile.name.endsWith('.png')) {
        image = await pdfDoc.embedPng(coverBytes);
      } else {
        image = await pdfDoc.embedJpg(coverBytes);
      }
      const pageW = targetWidth || image.width;
      const pageH = targetHeight || image.height;
      const page = pdfDoc.addPage([pageW, pageH]);
      page.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH });
      return page;
    }
  };

  const processCoverAddition = async () => {
    if (!docFile) return;
    setIsProcessing(true);

    try {
      const docBytes = await docFile.arrayBuffer();
      const basePdf = await PDFDocument.load(docBytes);
      const firstPage = basePdf.getPage(0);
      const { width: docW, height: docH } = firstPage.getSize();

      const outPdf = await PDFDocument.create();

      // Add Front Cover if specified
      if (frontCoverFile) {
        if (frontCoverFile.type === 'application/pdf' || frontCoverFile.name.endsWith('.pdf')) {
          const fcBytes = await frontCoverFile.arrayBuffer();
          const fcPdf = await PDFDocument.load(fcBytes);
          const [fcPage] = await outPdf.copyPages(fcPdf, [0]);
          outPdf.addPage(fcPage);
        } else {
          const fcBytes = await frontCoverFile.arrayBuffer();
          const img = frontCoverFile.name.endsWith('.png') ? await outPdf.embedPng(fcBytes) : await outPdf.embedJpg(fcBytes);
          const page = outPdf.addPage([docW, docH]);
          page.drawImage(img, { x: 0, y: 0, width: docW, height: docH });
        }
      }

      // Copy document pages
      const copiedPages = await outPdf.copyPages(basePdf, basePdf.getPageIndices());
      copiedPages.forEach(p => outPdf.addPage(p));

      // Add Back Cover if specified
      if (backCoverFile) {
        if (backCoverFile.type === 'application/pdf' || backCoverFile.name.endsWith('.pdf')) {
          const bcBytes = await backCoverFile.arrayBuffer();
          const bcPdf = await PDFDocument.load(bcBytes);
          const [bcPage] = await outPdf.copyPages(bcPdf, [0]);
          outPdf.addPage(bcPage);
        } else {
          const bcBytes = await backCoverFile.arrayBuffer();
          const img = backCoverFile.name.endsWith('.png') ? await outPdf.embedPng(bcBytes) : await outPdf.embedJpg(bcBytes);
          const page = outPdf.addPage([docW, docH]);
          page.drawImage(img, { x: 0, y: 0, width: docW, height: docH });
        }
      }

      const finalBytes = await outPdf.save();
      saveAs(new Blob([finalBytes], { type: 'application/pdf' }), `${docFile.name.replace(/\.pdf$/i, '')}_with_covers.pdf`);
    } catch (err) {
      alert(`Cover addition error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Cover Adder"
        description="Add customized front and back covers (images or PDF pages) to existing PDF documents and scale page dimensions seamlessly."
        workInstruction={`1. Upload Target PDF Document.\n2. Upload Front Cover Image/PDF (Optional).\n3. Upload Back Cover Image/PDF (Optional).\n4. Click 'Assemble Document with Covers' to download.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} style={{ color: '#34d399' }} /> Target Document & Covers
          </h3>

          <div className="form-group">
            <label className="form-label">1. Target PDF Document:</label>
            <label className="btn btn-primary" style={{ width: '100%' }}>
              <Upload size={16} /> Select PDF Document
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleDoc} />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {docFile ? docFile.name : 'No PDF selected'}
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">2. Front Cover (PNG, JPG, or PDF):</label>
            <label className="btn btn-secondary" style={{ width: '100%' }}>
              <Upload size={14} /> Select Front Cover
              <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFront} />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {frontCoverFile ? frontCoverFile.name : 'No front cover'}
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">3. Back Cover (PNG, JPG, or PDF):</label>
            <label className="btn btn-secondary" style={{ width: '100%' }}>
              <Upload size={14} /> Select Back Cover
              <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleBack} />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {backCoverFile ? backCoverFile.name : 'No back cover'}
            </span>
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={!docFile || isProcessing}
            onClick={processCoverAddition}
          >
            {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            Assemble Document with Covers
          </button>
        </div>
      </div>
    </div>
  );
}
