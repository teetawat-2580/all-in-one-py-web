import React, { useState, useEffect, useRef } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Image, Upload, Download, RefreshCw, Layers } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function PngReducer() {
  const [files, setFiles] = useState([]);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [scalePct, setScalePct] = useState('100%');
  const [targetDpi, setTargetDpi] = useState('Keep Original');
  const [targetRes, setTargetRes] = useState('Keep Original');
  const [previewMode, setPreviewMode] = useState('Reduced'); // 'Original' | 'Reduced'
  const [origInfo, setOrigInfo] = useState({ width: 0, height: 0, sizeKb: 0, url: '' });
  const [reducedInfo, setReducedInfo] = useState({ width: 0, height: 0, sizeKb: 0, url: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef(null);

  const handleFiles = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      setFiles(fileList);
      setSelectedFileIdx(0);
    }
  };

  useEffect(() => {
    if (files.length === 0 || selectedFileIdx >= files.length) return;

    const file = files[selectedFileIdx];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const origW = img.width;
        const origH = img.height;
        const origSizeKb = (file.size / 1024).toFixed(2);
        setOrigInfo({ width: origW, height: origH, sizeKb: origSizeKb, url: event.target.result });

        // Calculate reduced dimensions
        let newW = origW;
        let newH = origH;

        if (targetRes !== 'Keep Original') {
          const [tw, th] = targetRes.split('x').map(Number);
          const ratio = Math.min(tw / origW, th / origH);
          newW = Math.round(origW * ratio);
          newH = Math.round(origH * ratio);
        } else {
          const scale = parseInt(scalePct) / 100;
          newW = Math.round(origW * scale);
          newH = Math.round(origH * scale);
        }

        // Draw onto canvas to estimate size & URL
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, newW, newH);

        canvas.toBlob((blob) => {
          if (blob) {
            const redUrl = URL.createObjectURL(blob);
            const redSizeKb = (blob.size / 1024).toFixed(2);
            setReducedInfo({ width: newW, height: newH, sizeKb: redSizeKb, url: redUrl });
          }
        }, 'image/png');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }, [files, selectedFileIdx, scalePct, targetDpi, targetRes]);

  const processAndSaveAll = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    const zip = new JSZip();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
            let newW = img.width;
            let newH = img.height;
            if (targetRes !== 'Keep Original') {
              const [tw, th] = targetRes.split('x').map(Number);
              const ratio = Math.min(tw / img.width, th / img.height);
              newW = Math.round(img.width * ratio);
              newH = Math.round(img.height * ratio);
            } else {
              const scale = parseInt(scalePct) / 100;
              newW = Math.round(img.width * scale);
              newH = Math.round(img.height * scale);
            }

            const canvas = document.createElement('canvas');
            canvas.width = newW;
            canvas.height = newH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, newW, newH);

            canvas.toBlob((blob) => {
              const nameParts = file.name.split('.');
              const ext = nameParts.pop();
              const baseName = nameParts.join('.');
              zip.file(`${baseName}_reduced.png`, blob);
              resolve();
            }, 'image/png');
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    saveAs(zipContent, 'reduced_png_files.zip');
    setIsProcessing(false);
  };

  return (
    <div>
      <InfoHeader
        category="png"
        title="PNG Size Reducer"
        description="Batch reduce PNG image file sizes by scaling pixel dimensions and adjusting DPI settings while preserving transparent background alpha channels."
        workInstruction={`1. Click 'Select PNG File(s)' to load images.\n2. Select Scale percentage (100% to 10%) and Reduce DPI target (Keep Original, 300, 150, 96, 72).\n3. Switch between 'View Original' and 'View Reduced' to preview estimated file size, then click 'Process & Save All PNG Files'.`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        {/* Step 1 & 2 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} style={{ color: '#60a5fa' }} /> Step 1: Select Files & Destination
          </h3>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <label className="btn btn-primary">
              <Upload size={16} /> Select PNG File(s)
              <input type="file" multiple accept="image/png" style={{ display: 'none' }} onChange={handleFiles} />
            </label>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {files.length > 0 ? `${files.length} file(s) loaded` : 'No files selected'}
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#34d399' }} /> Step 2: Reduction Settings
          </h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Scale (Dimensions):</label>
              <select className="form-select" value={scalePct} onChange={(e) => setScalePct(e.target.value)}>
                <option value="100%">100% (Original)</option>
                <option value="80%">80%</option>
                <option value="50%">50%</option>
                <option value="20%">20%</option>
                <option value="10%">10%</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reduce DPI Target:</label>
              <select className="form-select" value={targetDpi} onChange={(e) => setTargetDpi(e.target.value)}>
                <option value="Keep Original">Keep Original</option>
                <option value="300">300 DPI</option>
                <option value="150">150 DPI</option>
                <option value="96">96 DPI</option>
                <option value="72">72 DPI</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Suggested Preset Resolution (Overrides Scale):</label>
            <select className="form-select" value={targetRes} onChange={(e) => setTargetRes(e.target.value)}>
              <option value="Keep Original">Keep Original</option>
              <option value="1920x1080">1920 x 1080 (Full HD)</option>
              <option value="1280x720">1280 x 720 (HD)</option>
              <option value="800x600">800 x 600</option>
              <option value="640x480">640 x 480</option>
            </select>
          </div>
        </div>

        {/* Step 3: Preview & Save */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image size={18} style={{ color: '#a78bfa' }} /> Step 3: Preview & Size Estimate
          </h3>

          {files.length > 0 && (
            <div className="form-group">
              <label className="form-label">Select File to Preview:</label>
              <select className="form-select" value={selectedFileIdx} onChange={(e) => setSelectedFileIdx(Number(e.target.value))}>
                {files.map((f, idx) => (
                  <option key={idx} value={idx}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
            <button
              className={`btn btn-sm ${previewMode === 'Original' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPreviewMode('Original')}
            >
              View Original
            </button>
            <button
              className={`btn btn-sm ${previewMode === 'Reduced' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPreviewMode('Reduced')}
            >
              View Reduced
            </button>
          </div>

          <div style={{ flexGrow: 1, background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {files.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No image loaded to display</span>
            ) : (
              <>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: previewMode === 'Original' ? '#60a5fa' : '#34d399' }}>
                  {previewMode === 'Original'
                    ? `ORIGINAL: ${origInfo.sizeKb} KB | ${origInfo.width}x${origInfo.height} px`
                    : `ESTIMATED: ~${reducedInfo.sizeKb} KB | ${reducedInfo.width}x${reducedInfo.height} px (${origInfo.sizeKb > 0 ? Math.round((1 - reducedInfo.sizeKb / origInfo.sizeKb) * 100) : 0}% saved)`}
                </div>

                <div style={{ maxWidth: '100%', maxHeight: '220px', overflow: 'hidden', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <img
                    src={previewMode === 'Original' ? origInfo.url : reducedInfo.url}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              </>
            )}
          </div>

          <button
            className="btn btn-success"
            style={{ marginTop: '16px', width: '100%' }}
            disabled={files.length === 0 || isProcessing}
            onClick={processAndSaveAll}
          >
            {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {isProcessing ? 'Processing PNGs...' : 'Process & Save All PNG Files (.ZIP)'}
          </button>
        </div>
      </div>
    </div>
  );
}
