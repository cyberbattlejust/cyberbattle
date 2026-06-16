'use client';

export default function ScanlineOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998]">
      <div className="absolute inset-0 opacity-[0.02]" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,234,0.1) 2px, rgba(0,255,234,0.1) 4px)',
      }} />
    </div>
  );
}
