import { useState, useEffect, useMemo } from 'react';
import { fetchPrediction, fetchConfidences, fetchRanking } from './api';
import PredictionSelector from './components/PredictionSelector';
import MetadataPanel from './components/MetadataPanel';
import StructureViewer from './components/StructureViewer';
import PLDDTStrip from './components/PLDDTStrip';
import PAEHeatmap from './components/PAEHeatmap';
import RankingBars from './components/RankingBars';

export default function App() {
  const [selected, setSelected] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [confidences, setConfidences] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch prediction details whenever selection changes
  useEffect(() => {
    if (!selected) return;

    setLoading(true);
    setError(null);
    setSelectedSample(null);

    Promise.all([
      fetchPrediction(selected),
      fetchConfidences(selected),
      fetchRanking(selected).catch(() => null),
    ])
      .then(([pred, conf, rank]) => {
        setPrediction({ ...pred, _selectedSample: null });
        setConfidences(conf);
        setRanking(rank);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [selected]);

  // Re-fetch confidences when sample changes
  useEffect(() => {
    if (!selected) return;
    if (selectedSample === null && prediction?._selectedSample === null) return;

    setPrediction(p => (p ? { ...p, _selectedSample: selectedSample } : p));

    fetchConfidences(selected, selectedSample)
      .then(conf => setConfidences(conf))
      .catch(() => {});
  }, [selectedSample]);

  const plddts = confidences?.atom_plddts || [];
  const pae = confidences?.pae || [];

  const avgPlddt = useMemo(() => {
    if (!plddts.length) return null;
    return plddts.reduce((a, b) => a + b, 0) / plddts.length;
  }, [plddts]);

  function handleSampleChange(sampleName) {
    setSelectedSample(sampleName);
  }

  return (
    <div className="app-shell">
      {/* Left Panel */}
      <PredictionSelector
        selected={selected}
        onSelect={setSelected}
        prediction={prediction}
        onSampleChange={handleSampleChange}
      />

      {/* Center Panel */}
      <main className="panel-center">
        {!selected && (
          <div className="state-empty">
            Select a prediction from the sidebar to begin
          </div>
        )}

        {loading && (
          <div className="state-loading">
            <div className="spin-dot" />
            Loading {selected}…
          </div>
        )}

        {error && <div className="state-error">{error}</div>}

        {selected && prediction && !loading && (
          <>
            {/* 3D Structure */}
            <div className="viz-section">
              <div className="viz-header">
                <h3>3D Structure</h3>
                <span className="viz-meta">
                  {prediction.name}{selectedSample ? ` · ${selectedSample}` : ''} · pLDDT colored
                </span>
              </div>
              <div className="viz-body-flush">
                <StructureViewer name={selected} sample={selectedSample} />
                <div className="plddt-legend">
                  {[
                    { c: '#0053D6', l: '>90' },
                    { c: '#65CBF3', l: '70–90' },
                    { c: '#FFDB13', l: '50–70' },
                    { c: '#FF7D45', l: '<50' },
                  ].map(t => (
                    <span key={t.l} className="legend-chip">
                      <span className="legend-dot" style={{ background: t.c }} />
                      {t.l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* pLDDT Strip Tracks */}
            <div className="viz-section">
              <div className="viz-header">
                <h3>Per-atom pLDDT</h3>
                <span className="viz-meta">
                  {plddts.length > 0
                    ? `${plddts.length} atoms · avg ${avgPlddt?.toFixed(1)}`
                    : 'no data'}
                </span>
              </div>
              <div className="viz-body" style={{ padding: '8px 0' }}>
                {plddts.length > 0 ? (
                  <>
                    <div className="plddt-strip-row">
                      <span className="plddt-strip-label">
                        pLDDT
                        <span className="strip-sub">{plddts.length} atoms</span>
                      </span>
                      <PLDDTStrip values={plddts} height={40} />
                    </div>
                    {/* Zoomed strip — first 200 */}
                    <div className="plddt-strip-row" style={{ marginTop: 2 }}>
                      <span className="plddt-strip-label">
                        Zoomed
                        <span className="strip-sub">1–{Math.min(200, plddts.length)}</span>
                      </span>
                      <PLDDTStrip values={plddts.slice(0, 200)} height={28} />
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '12px 14px', color: '#525252', fontSize: 12 }}>
                    No pLDDT data available
                  </div>
                )}
              </div>
            </div>

            {/* PAE Heatmap + Ranking */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="viz-section">
                <div className="viz-header">
                  <h3>PAE Heatmap</h3>
                  <span className="viz-meta">predicted aligned error</span>
                </div>
                <div className="viz-body">
                  <PAEHeatmap pae={pae} displaySize={280} />
                </div>
              </div>

              <div className="viz-section">
                <div className="viz-header">
                  <h3>Ranking Scores</h3>
                  <span className="viz-meta">per-sample comparison</span>
                </div>
                <div className="viz-body">
                  {ranking && ranking.length > 0 ? (
                    <RankingBars scores={ranking} />
                  ) : (
                    <div style={{ color: '#525252', fontSize: 12 }}>No ranking data</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Right Panel */}
      <MetadataPanel prediction={prediction} confidences={confidences} />
    </div>
  );
}
