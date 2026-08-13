import React, { useState, useRef } from 'react';
import InfoHeader from '../common/InfoHeader';
import { PenTool, Upload, Download, RefreshCw, Eye } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function PdfVectorizer() {
  const [file, setFile] = useState(null);
  const [threshold, setThreshold] = useState(128);
  const [svgOutput, setSvgOutput] = useState('');
  const [isTracing, setIsTracing] = useState(false);

  const canvasRef = useRef(null);

  const handleFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      traceImage(f, threshold);
    }
  };

  const traceImage = async (imgFile, threshVal) => {
    setIsTracing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;

        // Binarize & build SVG path string
        let svgPaths = [];
        const step = 2; // Pixel sampling step

        for (let y = 0; y < img.height; y += step) {
          let pathD = '';
          let inLine = false;

          for (let x = 0; x < img.width; x += step) {
            const idx = (y * img.width + x) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            if (gray < threshVal) {
              if (!inLine) {
                pathD += `M ${x} ${y} `;
                inLine = true;
              } else {
                pathD += `L ${x} ${y} `;
              }
            } else {
              inLine = false;
            }
          }
          if (pathD) svgPaths.push(`<path d="${pathD}" stroke="black" stroke-width="1.5" fill="none" />`);
        }

        const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${img.width} ${img.height}" width="${img.width}" height="${img.height}">\n<rect width="100%" height="100%" fill="white"/>\n${svgPaths.join('\n')}\n</svg>`;
        setSvgOutput(fullSvg);
        setIsTracing(false);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(imgFile);
  };

  const downloadSvg = () => {
    if (!svgOutput) return;
    const blob = new Blob([svgOutput], { type: 'image/svg+xml;charset=utf-8' });
    saveAs(blob, `${file ? file.name.split('.')[0] : 'vectorized'}.svg`);
  };

  return (
    <div>
      <InfoHeader
        category="pdf"
        title="Line Art Vectorizer"
        description="Convert raster line art drawings and sketches into resolution-independent SVG vector graphics and scalable vector PDFs."
        workInstruction={`1. Upload a line art image (PNG or JPG).\n2. Adjust Black & White Threshold slider (0 to 255).\n3. Preview vectorized SVG rendering.\n4. Click 'Download SVG Vector' to export.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} style={{ color: '#fbbf24' }} /> Vectorizer Settings
          </h3>

          <div className="form-group">
            <label className="btn btn-primary">
              <Upload size={16} /> Select Line Art Image
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {file ? file.name : 'No image loaded'}
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Threshold Cutoff ({threshold}):</label>
            <input
              type="range"
              min="10"
              max="240"
              value={threshold}
              onChange={(e) => {
                const val = Number(e.target.value);
                setThreshold(val);
                if (file) traceImage(file, val);
              }}
              style={{ width: '100%' }}
            />
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={!svgOutput || isTracing}
            onClick={downloadSvg}
          >
            {isTracing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            Download SVG Vector (.SVG)
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ margin: '0 0 16px 0', width: '100%', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={18} style={{ color: '#34d399' }} /> Vector SVG Preview
          </h3>

          {!svgOutput ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0' }}>
              Upload image to view vector trace
            </div>
          ) : (
            <div
              style={{ maxWidth: '100%', maxHeight: '350px', overflow: 'auto', background: '#fff', padding: '10px', borderRadius: '6px' }}
              dangerouslySetInnerHTML={{ __html: svgOutput }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
