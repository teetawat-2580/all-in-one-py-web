import React, { useState, useEffect, useRef } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Grid, Upload, Download, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function PngSlicer() {
  const [imageFile, setImageFile] = useState(null);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [imgObj, setImgObj] = useState(null);
  const [isSlicing, setIsSlicing] = useState(false);
  const canvasRef = useRef(null);

  const handleImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new window.Image();
        img.onload = () => {
          setImgObj(img);
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!imgObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = imgObj.width;
    canvas.height = imgObj.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(imgObj, 0, 0);

    // Draw grid lines
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = Math.max(2, Math.round(imgObj.width / 300));
    ctx.setLineDash([8, 4]);

    const cellW = imgObj.width / cols;
    const cellH = imgObj.height / rows;

    for (let c = 1; c < cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, imgObj.height);
      ctx.stroke();
    }

    for (let r = 1; r < rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(imgObj.width, r * cellH);
      ctx.stroke();
    }
  }, [imgObj, rows, cols]);

  const sliceAndDownload = async () => {
    if (!imgObj) return;
    setIsSlicing(true);

    const zip = new JSZip();
    const cellW = Math.floor(imgObj.width / cols);
    const cellH = Math.floor(imgObj.height / rows);

    let count = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = cellW;
        tileCanvas.height = cellH;
        const tileCtx = tileCanvas.getContext('2d');

        tileCtx.drawImage(
          imgObj,
          c * cellW, r * cellH, cellW, cellH,
          0, 0, cellW, cellH
        );

        await new Promise((resolve) => {
          tileCanvas.toBlob((blob) => {
            zip.file(`tile_row${r + 1}_col${c + 1}.png`, blob);
            resolve();
          }, 'image/png');
        });
        count++;
      }
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    saveAs(zipContent, `${imageFile ? imageFile.name.split('.')[0] : 'sliced'}_tiles.zip`);
    setIsSlicing(false);
  };

  return (
    <div>
      <InfoHeader
        category="png"
        title="Table Slicer"
        description="Slice grid tables or sprite sheet images into individual row x column cell images with visual grid overlay."
        workInstruction={`1. Upload a PNG or JPEG table/grid image.\n2. Specify Grid Rows and Grid Columns.\n3. Verify the grid overlay on the image preview.\n4. Click 'Slice Image & Download (.ZIP)' to export all tiles.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Grid size={18} style={{ color: '#fbbf24' }} /> Slice Configuration
          </h3>

          <div className="form-group">
            <label className="btn btn-primary">
              <Upload size={16} /> Select Table/Grid Image
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
            </label>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {imageFile ? imageFile.name : 'No image loaded'}
            </span>
          </div>

          <div className="grid-2" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">Rows ({rows}):</label>
              <input
                type="number"
                min="1"
                max="20"
                className="form-input"
                value={rows}
                onChange={(e) => setRows(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Columns ({cols}):</label>
              <input
                type="number"
                min="1"
                max="20"
                className="form-input"
                value={cols}
                onChange={(e) => setCols(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          <div style={{ margin: '16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Total Sliced Output: <strong>{rows * cols}</strong> tile images
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%' }}
            disabled={!imgObj || isSlicing}
            onClick={sliceAndDownload}
          >
            {isSlicing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {isSlicing ? 'Slicing Tiles...' : 'Slice Image & Download (.ZIP)'}
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ margin: '0 0 16px 0', width: '100%', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Grid size={18} style={{ color: '#60a5fa' }} /> Interactive Grid Preview
          </h3>

          {!imgObj ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0' }}>
              Upload an image to see grid slice overlay
            </div>
          ) : (
            <div style={{ maxWidth: '100%', maxHeight: '350px', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
