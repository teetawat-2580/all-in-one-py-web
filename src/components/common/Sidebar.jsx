import React from 'react';
import { FileText, Image, Globe, Folder, Sparkles } from 'lucide-react';

export default function Sidebar({ activeCategory, setActiveCategory }) {
  const categories = [
    { id: 'pdf', label: '📄 PDF Tools', icon: FileText, badge: '9 Tools', badgeClass: 'badge-pdf' },
    { id: 'png', label: '🖼️ PNG Tools', icon: Image, badge: '4 Tools', badgeClass: 'badge-png' },
    { id: 'web', label: '🌐 Web Tools', icon: Globe, badge: '4 Tools', badgeClass: 'badge-web' },
    { id: 'explorer', label: '📁 Explorer Tools', icon: Folder, badge: '1 Tool', badgeClass: 'badge-explorer' },
  ];

  return (
    <aside
      style={{
        width: '260px',
        height: '100vh',
        background: '#1e293b',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px', color: 'white' }}>
              SOFTWARE SUITE
            </h1>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>v1.0 • Unified Web Edition</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: '16px 12px', flexGrow: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '8px' }}>
          Tool Categories
        </div>

        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '12px 14px',
                marginBottom: '6px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                color: isActive ? 'white' : '#94a3b8',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={18} color={isActive ? 'white' : '#64748b'} />
                <span>{cat.label}</span>
              </div>
              <span className={`badge ${cat.badgeClass}`}>{cat.badge}</span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
        Client-Side Safe • Fast Browser Suite
      </div>
    </aside>
  );
}
