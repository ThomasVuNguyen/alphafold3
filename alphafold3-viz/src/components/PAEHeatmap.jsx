import { useRef, useEffect, useMemo } from 'react';

/**
 * PAE Heatmap — canvas-rendered contact-map style, matching AlphaGenome's ContactMap.
 * Renders at native resolution, CSS-scaled. Viridis-ish colormap.
 */
export default function PAEHeatmap({ pae, displaySize = 320 }) {
  const canvasRef = useRef(null);

  const size = useMemo(() => (pae?.length || 0), [pae]);

  useEffect(() => {
    if (!pae || !pae.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const N = Math.min(size, 400); // cap rendering resolution
    const scale = size / N;

    canvas.width = N;
    canvas.height = N;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = ctx.createImageData(N, N);

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const srcY = Math.floor(y * scale);
        const srcX = Math.floor(x * scale);

        if (srcY < pae.length && srcX < pae[srcY].length) {
          const t = Math.min(pae[srcY][srcX] / 30, 1);

          let r, g, b;
          if (t < 0.25) {
            const s = t / 0.25;
            r = Math.round(11 * (1 - s) + 26 * s);
            g = Math.round(83 * (1 - s) + 153 * s);
            b = Math.round(148 * (1 - s) + 136 * s);
          } else if (t < 0.5) {
            const s = (t - 0.25) / 0.25;
            r = Math.round(26 * (1 - s) + 124 * s);
            g = Math.round(153 * (1 - s) + 196 * s);
            b = Math.round(136 * (1 - s) + 124 * s);
          } else if (t < 0.75) {
            const s = (t - 0.5) / 0.25;
            r = Math.round(124 * (1 - s) + 245 * s);
            g = Math.round(196 * (1 - s) + 215 * s);
            b = Math.round(124 * (1 - s) + 66 * s);
          } else {
            const s = (t - 0.75) / 0.25;
            r = Math.round(245 * (1 - s) + 231 * s);
            g = Math.round(215 * (1 - s) + 76 * s);
            b = Math.round(66 * (1 - s) + 60 * s);
          }

          const idx = (y * N + x) * 4;
          img.data[idx] = r;
          img.data[idx + 1] = g;
          img.data[idx + 2] = b;
          img.data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  }, [pae, size]);

  if (!pae || !pae.length) {
    return <div style={{ color: '#525252', fontSize: 12 }}>No PAE data</div>;
  }

  return (
    <div className="pae-container">
      <div className="pae-canvas-wrap">
        <canvas
          ref={canvasRef}
          style={{ width: displaySize, height: displaySize }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span className="pae-axis-label">Scored residue →</span>
          <span className="pae-axis-label">{size}×{size}</span>
        </div>
      </div>
      <div className="pae-colorbar">
        <span style={{ fontSize: 9, color: '#737373', fontFamily: 'ui-monospace, monospace' }}>0 Å</span>
        <div className="cb-gradient" />
        <span style={{ fontSize: 9, color: '#737373', fontFamily: 'ui-monospace, monospace' }}>30 Å</span>
      </div>
    </div>
  );
}
