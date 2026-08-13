import React from 'react';
import { Info, BookOpen, MapPin } from 'lucide-react';
import BeforeAfterCard from './BeforeAfterCard';

export default function InfoHeader({ title, description, workInstruction, category = 'pdf', infographic }) {
  const categoryClasses = {
    pdf: 'wi-card-pdf',
    png: 'wi-card-png',
    web: 'wi-card-web',
    explorer: 'wi-card-explorer',
  };

  const currentClass = categoryClasses[category] || 'wi-card-pdf';

  return (
    <div className={`wi-card ${currentClass}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Info size={18} style={{ color: 'var(--accent-active)' }} />
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
          Description &amp; Work Instruction (WI) — {title}
        </h4>
      </div>
      
      <div style={{ display: 'flex', gap: '6px', fontSize: '13px', margin: '6px 0', color: '#e2e8f0' }}>
        <MapPin size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#60a5fa' }} />
        <div>
          <strong>Description: </strong>{description}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', fontSize: '13px', marginTop: '6px', color: '#cbd5e1', whiteSpace: 'pre-line' }}>
        <BookOpen size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#34d399' }} />
        <div>
          <strong>Work Instruction (WI):</strong>
          <br />
          {workInstruction}
        </div>
      </div>

      {/* Optional Before/After Infographic */}
      {infographic && (
        <BeforeAfterCard
          imageSrc={infographic.src}
          imageAlt={infographic.alt || `Before and after: ${title}`}
          title={infographic.title || 'Before & After Example'}
        />
      )}
    </div>
  );
}
