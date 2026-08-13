import React, { useState } from 'react';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import PdfTools from './components/pdf/PdfTools';
import PngTools from './components/png/PngTools';
import WebTools from './components/web/WebTools';
import ExplorerTools from './components/explorer/ExplorerTools';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('pdf');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Sidebar Navigation */}
      <Sidebar activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

      {/* Main Content Area */}
      <div style={{ flexGrow: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column' }}>
        <Header activeCategory={activeCategory} />

        <main style={{ flexGrow: 1 }}>
          {activeCategory === 'pdf' && <PdfTools />}
          {activeCategory === 'png' && <PngTools />}
          {activeCategory === 'web' && <WebTools />}
          {activeCategory === 'explorer' && <ExplorerTools />}
        </main>
      </div>
    </div>
  );
}
