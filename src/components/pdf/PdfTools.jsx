import React, { useState } from 'react';
import PdfViewer from './PdfViewer';
import PdfSplitter from './PdfSplitter';
import PdfPageToolkit from './PdfPageToolkit';
import PdfCoverAdder from './PdfCoverAdder';
import PdfSharpen from './PdfSharpen';
import PdfOptimizer from './PdfOptimizer';
import PdfOverlay from './PdfOverlay';
import PdfVectorizer from './PdfVectorizer';
import PdfColoringBooks from './PdfColoringBooks';
import { Eye, Scissors, Wrench, BookOpen, Sliders, Minimize2, Layers, PenTool, BookMarked } from 'lucide-react';

export default function PdfTools() {
  const [activeSubtab, setActiveSubtab] = useState('viewer');

  return (
    <div style={{ padding: '20px' }}>
      <div className="subtab-nav">
        <button className={`subtab-btn ${activeSubtab === 'viewer' ? 'active' : ''}`} onClick={() => setActiveSubtab('viewer')}>
          <Eye size={16} /> Viewer & Inspector
        </button>
        <button className={`subtab-btn ${activeSubtab === 'splitter' ? 'active' : ''}`} onClick={() => setActiveSubtab('splitter')}>
          <Scissors size={16} /> PDF Splitter
        </button>
        <button className={`subtab-btn ${activeSubtab === 'toolkit' ? 'active' : ''}`} onClick={() => setActiveSubtab('toolkit')}>
          <Wrench size={16} /> Page Toolkit
        </button>
        <button className={`subtab-btn ${activeSubtab === 'cover' ? 'active' : ''}`} onClick={() => setActiveSubtab('cover')}>
          <BookOpen size={16} /> Cover Adder
        </button>
        <button className={`subtab-btn ${activeSubtab === 'sharpen' ? 'active' : ''}`} onClick={() => setActiveSubtab('sharpen')}>
          <Sliders size={16} /> Sharpen & Enhance
        </button>
        <button className={`subtab-btn ${activeSubtab === 'optimizer' ? 'active' : ''}`} onClick={() => setActiveSubtab('optimizer')}>
          <Minimize2 size={16} /> Size Optimizer
        </button>
        <button className={`subtab-btn ${activeSubtab === 'overlay' ? 'active' : ''}`} onClick={() => setActiveSubtab('overlay')}>
          <Layers size={16} /> Watermark / Overlay PDF
        </button>
        <button className={`subtab-btn ${activeSubtab === 'vectorizer' ? 'active' : ''}`} onClick={() => setActiveSubtab('vectorizer')}>
          <PenTool size={16} /> Line Art Vectorizer
        </button>
        <button className={`subtab-btn ${activeSubtab === 'coloring' ? 'active' : ''}`} onClick={() => setActiveSubtab('coloring')}>
          <BookMarked size={16} /> Coloring Books 20 Pages
        </button>
      </div>

      {activeSubtab === 'viewer' && <PdfViewer />}
      {activeSubtab === 'splitter' && <PdfSplitter />}
      {activeSubtab === 'toolkit' && <PdfPageToolkit />}
      {activeSubtab === 'cover' && <PdfCoverAdder />}
      {activeSubtab === 'sharpen' && <PdfSharpen />}
      {activeSubtab === 'optimizer' && <PdfOptimizer />}
      {activeSubtab === 'overlay' && <PdfOverlay />}
      {activeSubtab === 'vectorizer' && <PdfVectorizer />}
      {activeSubtab === 'coloring' && <PdfColoringBooks />}
    </div>
  );
}
