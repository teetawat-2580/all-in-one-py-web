import React, { useState, useEffect, useRef, useCallback } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Grid, Upload, Download, RefreshCw, Eye } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function PngSlicer() {
  const [imageFile, setImageFile] = useState(null);
  const [imgObj, setImgObj] = useState(null);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(4);
  const [margin, setMargin] = useState(0);

  const [isSlicing, setIsSlicing] = useState(false);
  const [previewImages, setPreviewImages] = useState([]); // Base64 strings for preview

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Core geometric state (stored in refs for smooth interactive dragging without React re-renders)
  const state = useRef({
    scaleFactor: 1.0,
    rect: null, // [x1, y1, x2, y2] in original image coordinates
    vLines: [], // X coordinates
    hLines: [], // Y coordinates
    action: null,
    startX: 0,
    startY: 0,
    oldRect: null,
    canvasW: 0,
    canvasH: 0
  });

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgObj) return;
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.fillStyle = 'gray';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const s = state.current;
    if (!s.rect) return;

    // Draw image
    const drawW = imgObj.width * s.scaleFactor;
    const drawH = imgObj.height * s.scaleFactor;
    ctx.drawImage(imgObj, 0, 0, drawW, drawH);

    // Draw outer rect
    const [rx1, ry1, rx2, ry2] = s.rect;
    const x1 = rx1 * s.scaleFactor;
    const y1 = ry1 * s.scaleFactor;
    const x2 = rx2 * s.scaleFactor;
    const y2 = ry2 * s.scaleFactor;

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // Draw inner lines
    ctx.setLineDash([4, 4]);
    s.vLines.forEach(vx => {
      const x = vx * s.scaleFactor;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    });

    s.hLines.forEach(hy => {
      const y = hy * s.scaleFactor;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    });
  }, [imgObj]);

  const resetInnerLines = useCallback((forceRect = null) => {
    const s = state.current;
    if (!s.rect && !forceRect) return;
    const rect = forceRect || s.rect;
    
    const [x1, y1, x2, y2] = rect;
    const w = x2 - x1;
    const h = y2 - y1;

    const vLines = [];
    for (let i = 1; i < cols; i++) vLines.push(x1 + (w / cols) * i);
    s.vLines = vLines;

    const hLines = [];
    for (let i = 1; i < rows; i++) hLines.push(y1 + (h / rows) * i);
    s.hLines = hLines;

    drawGrid();
  }, [cols, rows, drawGrid]);

  const scaleInnerLines = (oldRect, newRect) => {
    const s = state.current;
    const oldW = oldRect[2] - oldRect[0];
    const oldH = oldRect[3] - oldRect[1];
    const newW = newRect[2] - newRect[0];
    const newH = newRect[3] - newRect[1];

    if (oldW <= 0 || oldH <= 0) return;

    s.vLines = s.vLines.map(vx => newRect[0] + ((vx - oldRect[0]) / oldW) * newW);
    s.hLines = s.hLines.map(hy => newRect[1] + ((hy - oldRect[1]) / oldH) * newH);
  };

  useEffect(() => {
    if (imgObj && containerRef.current && canvasRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = 450; // max height
      const iw = imgObj.width;
      const ih = imgObj.height;

      const scale = Math.min(cw / iw, ch / ih, 1.0);
      state.current.scaleFactor = scale;
      state.current.canvasW = cw;
      state.current.canvasH = ch;

      const canvas = canvasRef.current;
      canvas.width = iw * scale;
      canvas.height = ih * scale;

      state.current.rect = [10 / scale, 10 / scale, (canvas.width - 10) / scale, (canvas.height - 10) / scale];
      resetInnerLines();
    }
  }, [imgObj, resetInnerLines]);

  const hitTest = (ex, ey) => {
    const s = state.current;
    if (!s.rect) return 'OUTSIDE';
    
    const x = ex / s.scaleFactor;
    const y = ey / s.scaleFactor;
    const [x1, y1, x2, y2] = s.rect;
    const hitMargin = 8 / s.scaleFactor; // 8px screen tolerance

    for (let i = 0; i < s.vLines.length; i++) {
      if (Math.abs(x - s.vLines[i]) < hitMargin && y >= y1 && y <= y2) return `V_LINE_${i}`;
    }
    for (let i = 0; i < s.hLines.length; i++) {
      if (Math.abs(y - s.hLines[i]) < hitMargin && x >= x1 && x <= x2) return `H_LINE_${i}`;
    }

    if (Math.abs(x - x1) < hitMargin && Math.abs(y - y1) < hitMargin) return 'NW';
    if (Math.abs(x - x2) < hitMargin && Math.abs(y - y1) < hitMargin) return 'NE';
    if (Math.abs(x - x1) < hitMargin && Math.abs(y - y2) < hitMargin) return 'SW';
    if (Math.abs(x - x2) < hitMargin && Math.abs(y - y2) < hitMargin) return 'SE';

    if (Math.abs(x - x1) < hitMargin && y >= y1 && y <= y2) return 'W';
    if (Math.abs(x - x2) < hitMargin && y >= y1 && y <= y2) return 'E';
    if (Math.abs(y - y1) < hitMargin && x >= x1 && x <= x2) return 'N';
    if (Math.abs(y - y2) < hitMargin && x >= x1 && x <= x2) return 'S';

    if (x > x1 && x < x2 && y > y1 && y < y2) return 'INSIDE';
    return 'OUTSIDE';
  };

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const onPointerDown = (e) => {
    const pos = getMousePos(e);
    const s = state.current;
    
    s.startX = pos.x / s.scaleFactor;
    s.startY = pos.y / s.scaleFactor;
    s.action = hitTest(pos.x, pos.y);

    if (s.rect) s.oldRect = [...s.rect];

    if (s.action === 'OUTSIDE') {
      const imgX = pos.x / s.scaleFactor;
      const imgY = pos.y / s.scaleFactor;
      s.rect = [imgX, imgY, imgX, imgY];
      s.vLines = [];
      s.hLines = [];
    }
    canvasRef.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const s = state.current;
    if (!s.action || !s.rect) {
      // Hover cursor updates
      const pos = getMousePos(e);
      const action = hitTest(pos.x, pos.y);
      let cur = 'crosshair';
      if (action.startsWith('V_LINE_') || action === 'E' || action === 'W') cur = 'col-resize';
      else if (action.startsWith('H_LINE_') || action === 'N' || action === 'S') cur = 'row-resize';
      else if (action === 'NW' || action === 'SE') cur = 'nwse-resize';
      else if (action === 'NE' || action === 'SW') cur = 'nesw-resize';
      else if (action === 'INSIDE') cur = 'move';
      if (canvasRef.current.style.cursor !== cur) canvasRef.current.style.cursor = cur;
      return;
    }

    const pos = getMousePos(e);
    const mx = pos.x / s.scaleFactor;
    const my = pos.y / s.scaleFactor;

    if (s.action === 'INSIDE') {
      const dx = mx - s.startX;
      const dy = my - s.startY;
      s.rect[0] += dx; s.rect[1] += dy;
      s.rect[2] += dx; s.rect[3] += dy;
      scaleInnerLines(s.oldRect, s.rect);
      s.oldRect = [...s.rect];
      s.startX = mx; s.startY = my;
    } else if (s.action === 'OUTSIDE') {
      s.rect[2] = mx;
      s.rect[3] = my;
    } else if (s.action.startsWith('V_LINE_')) {
      const idx = parseInt(s.action.split('_')[2], 10);
      const minX = idx === 0 ? s.rect[0] : s.vLines[idx-1];
      const maxX = idx === s.vLines.length - 1 ? s.rect[2] : s.vLines[idx+1];
      s.vLines[idx] = Math.max(minX + 2, Math.min(mx, maxX - 2));
    } else if (s.action.startsWith('H_LINE_')) {
      const idx = parseInt(s.action.split('_')[2], 10);
      const minY = idx === 0 ? s.rect[1] : s.hLines[idx-1];
      const maxY = idx === s.hLines.length - 1 ? s.rect[3] : s.hLines[idx+1];
      s.hLines[idx] = Math.max(minY + 2, Math.min(my, maxY - 2));
    } else {
      if (s.action.includes('N')) s.rect[1] = my;
      if (s.action.includes('S')) s.rect[3] = my;
      if (s.action.includes('W')) s.rect[0] = mx;
      if (s.action.includes('E')) s.rect[2] = mx;
      scaleInnerLines(s.oldRect, s.rect);
      s.oldRect = [...s.rect];
    }
    drawGrid();
  };

  const onPointerUp = (e) => {
    const s = state.current;
    if (s.rect) {
      const x1 = Math.min(s.rect[0], s.rect[2]);
      const y1 = Math.min(s.rect[1], s.rect[3]);
      const x2 = Math.max(s.rect[0], s.rect[2]);
      const y2 = Math.max(s.rect[1], s.rect[3]);
      s.rect = [x1, y1, x2, y2];
    }
    if (s.action === 'OUTSIDE') resetInnerLines();
    s.action = null;
    canvasRef.current.releasePointerCapture(e.pointerId);
  };

  const handleImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewImages([]);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new window.Image();
        img.onload = () => setImgObj(img);
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const getCropBoxes = () => {
    const s = state.current;
    if (!s.rect) return [];
    const xCoords = [s.rect[0], ...s.vLines, s.rect[2]].sort((a,b)=>a-b);
    const yCoords = [s.rect[1], ...s.hLines, s.rect[3]].sort((a,b)=>a-b);

    const boxes = [];
    for (let r = 0; r < yCoords.length - 1; r++) {
      for (let c = 0; c < xCoords.length - 1; c++) {
        let left = Math.round(xCoords[c]);
        let right = Math.round(xCoords[c+1]);
        let top = Math.round(yCoords[r]);
        let bottom = Math.round(yCoords[r+1]);

        left += margin;
        top += margin;
        right -= margin;
        bottom -= margin;

        if (left >= right || top >= bottom) {
          left = Math.round(xCoords[c]);
          right = Math.round(xCoords[c+1]);
          top = Math.round(yCoords[r]);
          bottom = Math.round(yCoords[r+1]);
        }
        boxes.push([left, top, right, bottom]);
      }
    }
    return boxes;
  };

  const previewCuts = () => {
    if (!imgObj) return;
    const boxes = getCropBoxes();
    
    const hiddenCanvas = document.createElement('canvas');
    const hctx = hiddenCanvas.getContext('2d');
    
    const previews = [];
    for (let b of boxes) {
      const [l, t, r, btm] = b;
      const w = r - l;
      const h = btm - t;
      if (w <= 0 || h <= 0) continue;
      
      hiddenCanvas.width = w;
      hiddenCanvas.height = h;
      hctx.drawImage(imgObj, l, t, w, h, 0, 0, w, h);
      previews.push(hiddenCanvas.toDataURL('image/png'));
    }
    setPreviewImages(previews);
  };

  const sliceAndDownload = async () => {
    if (!imgObj) return;
    setIsSlicing(true);

    const zip = new JSZip();
    const boxes = getCropBoxes();
    
    const tileCanvas = document.createElement('canvas');
    const tileCtx = tileCanvas.getContext('2d');

    const baseName = imageFile ? imageFile.name.split('.')[0] : 'sliced';

    for (let i = 0; i < boxes.length; i++) {
      const [l, t, r, btm] = boxes[i];
      const w = r - l;
      const h = btm - t;
      if (w <= 0 || h <= 0) continue;

      tileCanvas.width = w;
      tileCanvas.height = h;
      tileCtx.drawImage(imgObj, l, t, w, h, 0, 0, w, h);

      await new Promise((resolve) => {
        tileCanvas.toBlob((blob) => {
          zip.file(`${baseName}_table_cut_${i + 1}.png`, blob);
          resolve();
        }, 'image/png');
      });
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    saveAs(zipContent, `${baseName}_table_cuts.zip`);
    setIsSlicing(false);
  };

  return (
    <div>
      <InfoHeader
        category="png"
        title="Table Slicer"
        description="Slice large image tables, document grids, or tall screenshots into horizontal and vertical row/column cell images with independent draggable lines and margin trimming."
        workInstruction={`1. Click '1. Select Target PNG' to load an image table or grid.\n2. Drag outer corners/edges to resize, drag center to move, or drag INNER lines to align with table gaps.\n3. Adjust Cut Margin (px) to trim line borders, then click 'Preview Cuts' or 'Slice & Save'.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px', gap: '20px' }}>
        
        {/* Left: Controls */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Grid size={18} style={{ color: '#fbbf24' }} /> Slice Configuration
          </h3>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="btn btn-primary">
              <Upload size={16} /> 1. Select Target PNG
              <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handleImage} />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {imageFile ? imageFile.name : 'No image loaded'}
            </span>
          </div>

          <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 13 }}>Cols:</label>
              <input type="number" min="1" max="50" className="form-input" style={{ fontSize: 13 }} value={cols}
                onChange={(e) => { setCols(Math.max(1, Number(e.target.value))); }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 13 }}>Rows:</label>
              <input type="number" min="1" max="50" className="form-input" style={{ fontSize: 13 }} value={rows}
                onChange={(e) => { setRows(Math.max(1, Number(e.target.value))); }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => resetInnerLines(null)}>
              Reset Spacing
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="form-label" style={{ margin: 0, fontSize: 13, color: '#60a5fa', fontWeight: 600 }}>Cut Margin (px):</label>
              <input type="number" min="0" max="100" className="form-input" style={{ width: 60, fontSize: 13 }} value={margin}
                onChange={(e) => setMargin(Number(e.target.value))} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" disabled={!imgObj} onClick={previewCuts}>
              <Eye size={16} /> Preview Cuts
            </button>
            
            <button className="btn btn-success" disabled={!imgObj || isSlicing} onClick={sliceAndDownload}>
              {isSlicing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              {isSlicing ? 'Slicing...' : 'Slice & Save (.ZIP)'}
            </button>
          </div>
        </div>

        {/* Right: Interactive Canvas */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Interactive Table Canvas (Drag Box & Inner Lines)
          </h3>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            Instructions: Drag edges to resize | Drag center to move | Drag INNER lines to fix gaps | Increase 'Cut Margin' to remove table lines
          </div>

          {!imgObj ? (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 6, minHeight: 300 }}>
              Upload an image to start slicing
            </div>
          ) : (
            <div ref={containerRef} style={{ width: '100%', background: '#333', overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, touchAction: 'none' }}>
              <canvas
                ref={canvasRef}
                style={{ cursor: 'crosshair', display: 'block' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
            </div>
          )}
        </div>
      </div>

      {/* Preview Output */}
      {previewImages.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Preview Cuts ({previewImages.length} Tiles)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '4px', background: '#1e293b', padding: '10px', borderRadius: 6, overflowX: 'auto' }}>
            {previewImages.map((src, idx) => (
              <img key={idx} src={src} alt={`Tile ${idx+1}`} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.2)', background: '#fff' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
