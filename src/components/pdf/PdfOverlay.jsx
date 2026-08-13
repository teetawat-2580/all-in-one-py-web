import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Layers, Upload, Download, RefreshCw, Type, Image } from 'lucide-react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function PdfOverlay() {
  const [basePdfFile, setBasePdfFile] = useState(null);
  const [wmType, setWmType] = useState('text'); // text, image
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(36);
  const [opacity, setOpacity] = useState(0.4);
  const [position, setPosition] = useState('center'); // center, top-left, top-right, bottom-left, bottom-right, tile
  const [rotation, setRotation] = useState(45);
  const [wmImageFile, setWmImageFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBase = (e) => e.target.files && setBasePdfFile(e.target.files[0]);
  const handleWmImg = (e) => e.target.files && setWmImageFile(e.target.files[0]);

  const processOverlay = async () => {
    if (!basePdfFile) return;
    setIsProcessing(true);

    try {
      const buffer = await basePdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let logoImage = null;
      if (wmType === 'image' && wmImageFile) {
        const imgBytes = await wmImageFile.arrayBuffer();
        if (wmImageFile.name.endsWith('.png')) {
          logoImage = await pdfDoc.embedPng(imgBytes);
        } else {
          logoImage = await pdfDoc.embedJpg(imgBytes);
        }
      }

      pages.forEach(page => {
        const { width, height } = page.getSize();

        const drawWMAt = (x, y) => {
          if (wmType === 'text') {
            const textWidth = font.widthOfTextAtSize(wmText, fontSize);
            page.drawText(wmText, {
              x: x - textWidth / 2,
              y: y,
              size: fontSize,
              font: font,
              color: rgb(0.8, 0.1, 0.1),
              opacity: Number(opacity),
              rotate: degrees(Number(rotation)),
            });
          } else if (wmType === 'image' && logoImage) {
            const scale = 0.3;
            const w = logoImage.width * scale;
            const h = logoImage.height * scale;
            page.drawImage(logoImage, {
              x: x - w / 2,
              y: y - h / 2,
              width: w,
              height: h,
              opacity: Number(opacity),
              rotate: degrees(Number(rotation)),
            });
          }
        };

        if (position === 'tile') {
          for (let y = 100; y < height; y += 150) {
            for (let x = 100; x < width; x += 200) {
              drawWMAt(x, y);
            }
          }
        } else {
          let cx = width / 2;
          let cy = height / 2;
          if (position === 'top-left') { cx = 100; cy = height - 100; }
          else if (position === 'top-right') { cx = width - 100; cy = height - 100; }
          else if (position === 'bottom-left') { cx = 100; cy = 100; }
          else if (position === 'bottom-right') { cx = width - 100; cy = 100; }

          drawWMAt(cx, cy);
        }
      });

      const pdfBytes = await pdfDoc.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `${basePdfFile.name.replace(/\.pdf$/i, '')}_watermarked.pdf`);
    } catch (err) {
      alert(`Overlay error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Watermark / Overlay PDF"
        description="Overlay text or image logo watermarks across all pages of a PDF document with opacity, scaling, and positioning control."
        workInstruction={`1. Upload Target PDF Document.\n2. Choose Watermark Type (Text or Image Logo).\n3. Set Watermark Text, Opacity, Rotation Angle, and Position.\n4. Click 'Apply Watermark & Save PDF'.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#a78bfa' }} /> Watermark Configuration
          </h3>

          <div className="form-group">
            <label className="btn btn-primary">
              <Upload size={16} /> Select Base PDF Document
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleBase} />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {basePdfFile ? basePdfFile.name : 'No file selected'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', margin: '16px 0' }}>
            <button className={`btn btn-sm ${wmType === 'text' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWmType('text')}>
              <Type size={14} /> Text Watermark
            </button>
            <button className={`btn btn-sm ${wmType === 'image' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWmType('image')}>
              <Image size={14} /> Logo Image
            </button>
          </div>

          {wmType === 'text' ? (
            <div>
              <div className="form-group">
                <label className="form-label">Watermark Text:</label>
                <input type="text" className="form-input" value={wmText} onChange={(e) => setWmText(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Font Size ({fontSize}pt):</label>
                <input type="range" min="12" max="100" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="btn btn-secondary btn-sm">
                <Upload size={14} /> Upload Watermark Logo (PNG/JPG)
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWmImg} />
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {wmImageFile ? wmImageFile.name : 'No image selected'}
              </span>
            </div>
          )}

          <div className="grid-2" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">Opacity ({Math.round(opacity * 100)}%):</label>
              <input type="range" min="0.1" max="1.0" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Rotation ({rotation}°):</label>
              <input type="range" min="-180" max="180" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Position:</label>
            <select className="form-select" value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="center">Center</option>
              <option value="top-left">Top-Left Corner</option>
              <option value="top-right">Top-Right Corner</option>
              <option value="bottom-left">Bottom-Left Corner</option>
              <option value="bottom-right">Bottom-Right Corner</option>
              <option value="tile">Tile Grid</option>
            </select>
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={!basePdfFile || isProcessing}
            onClick={processOverlay}
          >
            {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            Apply Watermark & Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
