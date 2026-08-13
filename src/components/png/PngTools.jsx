import React, { useState } from 'react';
import PngReducer from './PngReducer';
import PngTrimmer from './PngTrimmer';
import PngSlicer from './PngSlicer';
import PngOverlay from './PngOverlay';
import { Minimize2, Crop, Grid, Layers } from 'lucide-react';

export default function PngTools() {
  const [activeSubtab, setActiveSubtab] = useState('reducer');

  return (
    <div style={{ padding: '20px' }}>
      <div className="subtab-nav">
        <button
          className={`subtab-btn ${activeSubtab === 'reducer' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('reducer')}
        >
          <Minimize2 size={16} /> PNG Size Reducer
        </button>
        <button
          className={`subtab-btn ${activeSubtab === 'trimmer' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('trimmer')}
        >
          <Crop size={16} /> Margin Trimmer & PDF Merger
        </button>
        <button
          className={`subtab-btn ${activeSubtab === 'slicer' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('slicer')}
        >
          <Grid size={16} /> Table Slicer
        </button>
        <button
          className={`subtab-btn ${activeSubtab === 'overlay' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('overlay')}
        >
          <Layers size={16} /> Watermark / Overlay PNG
        </button>
      </div>

      {activeSubtab === 'reducer' && <PngReducer />}
      {activeSubtab === 'trimmer' && <PngTrimmer />}
      {activeSubtab === 'slicer' && <PngSlicer />}
      {activeSubtab === 'overlay' && <PngOverlay />}
    </div>
  );
}
