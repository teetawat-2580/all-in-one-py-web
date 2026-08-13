import React, { useState, useEffect, useRef } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Layers, Upload, Download, Type, Image } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function PngOverlay() {
  const [baseFiles, setBaseFiles] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'image'
  
  // Text watermark state
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState('#ffffff');
  
  // Image watermark state
  const [wmImgFile, setWmImgFile] = useState(null);
  const [wmImgObj, setWmImgObj] = useState(null);
  const [wmScale, setWmScale] = useState(50); // %

  // Shared state
  const [opacity, setOpacity] = useState(50); // %
  const [position, setPosition] = useState('center'); // center, top-left, top-right, bottom-left, bottom-right, tile
  const [rotation, setRotation] = useState(0);

  const canvasRef = useRef(null);
  const [baseImgObj, setBaseImgObj] = useState(null);

  const handleBaseFiles = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setBaseFiles(Array.from(e.target.files));
      setSelectedIdx(0);
    }
  };

  const handleWmImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setWmImgFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new window.Image();
        img.onload = () => setWmImgObj(img);
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (baseFiles.length === 0 || selectedIdx >= baseFiles.length) {
      setBaseImgObj(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new window.Image();
      img.onload = () => setBaseImgObj(img);
      img.src = evt.target.result;
    };
    reader.readAsDataURL(baseFiles[selectedIdx]);
  }, [baseFiles, selectedIdx]);

  useEffect(() => {
    if (!baseImgObj || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = baseImgObj.width;
    canvas.height = baseImgObj.height;
    const ctx = canvas.getContext('2d');

    // Draw base
    ctx.drawImage(baseImgObj, 0, 0);

    ctx.save();
    ctx.globalAlpha = opacity / 100;

    const drawWatermarkAt = (x, y, w, h, renderFn) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      renderFn();
      ctx.restore();
    };

    const getCoordinates = (w, h) => {
      let x = baseImgObj.width / 2;
      let y = baseImgObj.height / 2;
      const pad = 30;

      if (position === 'top-left') { x = pad + w / 2; y = pad + h / 2; }
      else if (position === 'top-right') { x = baseImgObj.width - pad - w / 2; y = pad + h / 2; }
      else if (position === 'bottom-left') { x = pad + w / 2; y = baseImgObj.height - pad - h / 2; }
      else if (position === 'bottom-right') { x = baseImgObj.width - pad - w / 2; y = baseImgObj.height - pad - h / 2; }

      return { x, y };
    };

    if (watermarkType === 'text') {
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(wmText);
      const textW = metrics.width;
      const textH = fontSize;

      const renderText = () => ctx.fillText(wmText, 0, 0);

      if (position === 'tile') {
        const stepX = textW + 100;
        const stepY = textH + 80;
        for (let y = stepY / 2; y < baseImgObj.height + stepY; y += stepY) {
          for (let x = stepX / 2; x < baseImgObj.width + stepX; x += stepX) {
            drawWatermarkAt(x, y, textW, textH, renderText);
          }
        }
      } else {
        const { x, y } = getCoordinates(textW, textH);
        drawWatermarkAt(x, y, textW, textH, renderText);
      }
    } else if (watermarkType === 'image' && wmImgObj) {
      const scale = wmScale / 100;
      const wmW = wmImgObj.width * scale;
      const wmH = wmImgObj.height * scale;

      const renderImg = () => ctx.drawImage(wmImgObj, -wmW / 2, -wmH / 2, wmW, wmH);

      if (position === 'tile') {
        const stepX = wmW + 80;
        const stepY = wmH + 80;
        for (let y = stepY / 2; y < baseImgObj.height + stepY; y += stepY) {
          for (let x = stepX / 2; x < baseImgObj.width + stepX; x += stepX) {
            drawWatermarkAt(x, y, wmW, wmH, renderImg);
          }
        }
      } else {
        const { x, y } = getCoordinates(wmW, wmH);
        drawWatermarkAt(x, y, wmW, wmH, renderImg);
      }
    }

    ctx.restore();
  }, [baseImgObj, watermarkType, wmText, fontSize, textColor, wmImgObj, wmScale, opacity, position, rotation]);

  const downloadAll = async () => {
    if (baseFiles.length === 0) return;
    const zip = new JSZip();

    for (let i = 0; i < baseFiles.length; i++) {
      const file = baseFiles[i];
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            ctx.save();
            ctx.globalAlpha = opacity / 100;

            const drawWM = (x, y, renderFn) => {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate((rotation * Math.PI) / 180);
              renderFn();
              ctx.restore();
            };

            if (watermarkType === 'text') {
              ctx.font = `bold ${fontSize}px sans-serif`;
              ctx.fillStyle = textColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const metrics = ctx.measureText(wmText);
              const textW = metrics.width;
              const textH = fontSize;
              const renderText = () => ctx.fillText(wmText, 0, 0);

              if (position === 'tile') {
                for (let y = 100; y < img.height + 100; y += textH + 80) {
                  for (let x = 100; x < img.width + 100; x += textW + 100) {
                    drawWM(x, y, renderText);
                  }
                }
              } else {
                let x = img.width / 2, y = img.height / 2;
                if (position === 'top-left') { x = 40; y = 40; }
                else if (position === 'top-right') { x = img.width - 40; y = 40; }
                else if (position === 'bottom-left') { x = 40; y = img.height - 40; }
                else if (position === 'bottom-right') { x = img.width - 40; y = img.height - 40; }
                drawWM(x, y, renderText);
              }
            } else if (watermarkType === 'image' && wmImgObj) {
              const scale = wmScale / 100;
              const wmW = wmImgObj.width * scale;
              const wmH = wmImgObj.height * scale;
              const renderImg = () => ctx.drawImage(wmImgObj, -wmW / 2, -wmH / 2, wmW, wmH);

              if (position === 'tile') {
                for (let y = wmH; y < img.height + wmH; y += wmH + 80) {
                  for (let x = wmW; x < img.width + wmW; x += wmW + 80) {
                    drawWM(x, y, renderImg);
                  }
                }
              } else {
                let x = img.width / 2, y = img.height / 2;
                if (position === 'top-left') { x = wmW / 2 + 20; y = wmH / 2 + 20; }
                else if (position === 'top-right') { x = img.width - wmW / 2 - 20; y = wmH / 2 + 20; }
                else if (position === 'bottom-left') { x = wmW / 2 + 20; y = img.height - wmH / 2 - 20; }
                else if (position === 'bottom-right') { x = img.width - wmW / 2 - 20; y = img.height - wmH / 2 - 20; }
                drawWM(x, y, renderImg);
              }
            }

            ctx.restore();

            canvas.toBlob((blob) => {
              const nameParts = file.name.split('.');
              const ext = nameParts.pop();
              const baseName = nameParts.join('.');
              zip.file(`${baseName}_watermarked.${ext}`, blob);
              resolve();
            }, 'image/png');
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    saveAs(zipContent, 'watermarked_images.zip');
  };

  return (
    <div>
      <InfoHeader
        category="png"
        title="Watermark / Overlay PNG"
        description="Overlay text or image logo watermarks onto PNG images with customizable transparency, scaling, positioning grid, and tiling."
        workInstruction={`1. Upload base PNG images.\n2. Choose Watermark Type (Text or Image Logo).\n3. Adjust Opacity, Position (Center, Corners, Tile), Rotation, and Font/Scale settings.\n4. Preview in real-time and click 'Download Watermarked Images (.ZIP)'.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#a78bfa' }} /> Watermark Settings
          </h3>

          <div className="form-group">
            <label className="btn btn-primary">
              <Upload size={16} /> Select Base PNG Images
              <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleBaseFiles} />
            </label>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {baseFiles.length} base image(s) loaded
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', margin: '16px 0' }}>
            <button
              className={`btn btn-sm ${watermarkType === 'text' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setWatermarkType('text')}
            >
              <Type size={14} /> Text Watermark
            </button>
            <button
              className={`btn btn-sm ${watermarkType === 'image' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setWatermarkType('image')}
            >
              <Image size={14} /> Logo/Image Watermark
            </button>
          </div>

          {watermarkType === 'text' ? (
            <div>
              <div className="form-group">
                <label className="form-label">Watermark Text:</label>
                <input
                  type="text"
                  className="form-input"
                  value={wmText}
                  onChange={(e) => setWmText(e.target.value)}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Font Size ({fontSize}px):</label>
                  <input
                    type="range"
                    min="12"
                    max="150"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Text Color:</label>
                  <input
                    type="color"
                    className="form-input"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    style={{ height: '38px', padding: '2px' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="form-group">
                <label className="btn btn-secondary btn-sm">
                  <Upload size={14} /> Upload Logo Image
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWmImage} />
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {wmImgFile ? wmImgFile.name : 'No logo selected'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Logo Scale ({wmScale}%):</label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={wmScale}
                  onChange={(e) => setWmScale(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Opacity ({opacity}%):</label>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rotation ({rotation}°):</label>
              <input
                type="range"
                min="-180"
                max="180"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Watermark Position:</label>
            <select className="form-select" value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="center">Center</option>
              <option value="top-left">Top-Left Corner</option>
              <option value="top-right">Top-Right Corner</option>
              <option value="bottom-left">Bottom-Left Corner</option>
              <option value="bottom-right">Bottom-Right Corner</option>
              <option value="tile">Tile Grid (Repeat across image)</option>
            </select>
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={baseFiles.length === 0}
            onClick={downloadAll}
          >
            <Download size={16} /> Download Watermarked Images (.ZIP)
          </button>
        </div>

        {/* Realtime Canvas Preview */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ margin: '0 0 16px 0', width: '100%', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#60a5fa' }} /> Real-time Watermark Preview
          </h3>

          {!baseImgObj ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0' }}>
              Upload base image to see watermark preview
            </div>
          ) : (
            <div style={{ maxWidth: '100%', maxHeight: '380px', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
