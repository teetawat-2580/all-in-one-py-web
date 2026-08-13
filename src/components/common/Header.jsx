import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function Header({ activeCategory }) {
  const categoryTitles = {
    pdf: '📄 PDF Tools & Inspector Suite',
    png: '🖼️ PNG Image Processing & Trimmer Suite',
    web: '🌐 Web Link Extractors & Browser Snippets',
    explorer: '📁 File Explorer Filename Extractor Suite',
  };

  return (
    <header
      style={{
        height: '64px',
        background: 'rgba(30, 41, 59, 0.9)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'white' }}>
          {categoryTitles[activeCategory] || 'Unified Software Suite'}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '4px 10px', borderRadius: '9999px' }}>
          <ShieldCheck size={14} /> 100% Offline Client-Side Safe
        </div>

        <a
          href="https://github.com/teetawat-2580/all-in-one-py-web"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
          GitHub Repository
        </a>
      </div>
    </header>
  );
}
