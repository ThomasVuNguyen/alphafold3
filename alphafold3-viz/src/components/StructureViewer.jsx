import { useRef, useEffect, useState } from 'react';
import { getStructureUrl } from '../api';

/**
 * 3D Structure Viewer — 3Dmol.js with pLDDT coloring.
 * CIF files are proxied through the local backend (Modal URL is never exposed).
 */
export default function StructureViewer({ name, sample = null }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!window.$3Dmol) {
      const script = document.createElement('script');
      script.src = 'https://3dmol.csb.pitt.edu/build/3Dmol-min.js';
      script.onload = () => initViewer();
      script.onerror = () => setError('Failed to load 3Dmol.js');
      document.head.appendChild(script);
    } else {
      initViewer();
    }

    async function initViewer() {
      if (!containerRef.current || !window.$3Dmol) return;

      try {
        setLoading(true);
        setError(null);

        const url = getStructureUrl(name, sample);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Structure file not found');
        const cifData = await response.text();

        if (viewerRef.current) {
          containerRef.current.innerHTML = '';
        }

        const viewer = window.$3Dmol.createViewer(containerRef.current, {
          backgroundColor: '#090909',
          antialias: true,
        });

        viewer.addModel(cifData, 'cif');
        viewer.setStyle({}, {
          cartoon: {
            colorfunc: function (atom) {
              const b = atom.b;
              if (b >= 90) return '#0053D6';
              if (b >= 70) return '#65CBF3';
              if (b >= 50) return '#FFDB13';
              return '#FF7D45';
            },
          },
        });

        viewer.zoomTo();
        viewer.render();
        viewer.spin('y', 0.3);
        viewerRef.current = viewer;
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    return () => {
      if (viewerRef.current) viewerRef.current = null;
    };
  }, [name, sample]);

  return (
    <div>
      <div
        ref={containerRef}
        className="structure-viewer"
        style={{ display: loading && !error ? 'none' : 'block' }}
      />
      {loading && !error && (
        <div className="structure-viewer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="state-loading">
            <div className="spin-dot" />
            <span>Loading structure…</span>
          </div>
        </div>
      )}
      {error && (
        <div className="structure-viewer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="state-error">⚠ {error}</span>
        </div>
      )}
    </div>
  );
}
