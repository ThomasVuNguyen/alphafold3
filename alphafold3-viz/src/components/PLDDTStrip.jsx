import { useEffect, useRef } from 'react';

/**
 * Canvas-based pLDDT strip — matching AlphaGenome's TrackStrip style.
 * Renders per-atom pLDDT as vertical bars, color-coded by confidence band.
 */
export default function PLDDTStrip({ values, height = 36 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !values || values.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = height;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, cssW, cssH);

    const n = values.length;
    const barW = cssW / n;

    // Draw threshold lines (faint dashes)
    ctx.strokeStyle = '#1a1a1a';
    ctx.setLineDash([2, 3]);
    [90, 70, 50].forEach(t => {
      const y = cssH - (t / 100) * cssH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw bars — color by pLDDT band
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v <= 0) continue;

      if (v >= 90) ctx.fillStyle = '#0053D6';
      else if (v >= 70) ctx.fillStyle = '#65CBF3';
      else if (v >= 50) ctx.fillStyle = '#FFDB13';
      else ctx.fillStyle = '#FF7D45';

      const h = (v / 100) * cssH;
      ctx.fillRect(i * barW, cssH - h, Math.max(barW, 0.5), h);
    }
  }, [values, height]);

  if (!values || values.length === 0) {
    return <div style={{ height, background: '#0a0a0a', borderRadius: 4 }} />;
  }

  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />;
}
