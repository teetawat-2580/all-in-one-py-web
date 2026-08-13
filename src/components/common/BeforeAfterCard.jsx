import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

/**
 * BeforeAfterCard — inline SVG-based before/after visual with optional real infographic image.
 *
 * Props:
 *   imageSrc     — URL to the infographic PNG image (from /infographics/)
 *   imageAlt     — Alt text
 *   title        — Optional title shown above the image
 *   defaultOpen  — Whether expanded by default (default: false)
 */
export default function BeforeAfterCard({ imageSrc, imageAlt, title, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!imageSrc) return null;

  return (
    <div style={{
      margin: '10px 0 4px 0',
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid rgba(6,182,212,0.25)',
      background: 'rgba(6,182,212,0.04)'
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#67e8f9',
          fontSize: '13px',
          fontWeight: 600,
          gap: 6
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Lightbulb size={15} style={{ color: '#fbbf24' }} />
          {title || 'Before & After Example'}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
            — click to {open ? 'hide' : 'show'} infographic
          </span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Image panel */}
      {open && (
        <div style={{ padding: '0 14px 14px 14px' }}>
          <img
            src={imageSrc}
            alt={imageAlt || 'Before and after infographic'}
            style={{
              width: '100%',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'block'
            }}
          />
        </div>
      )}
    </div>
  );
}
