import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPrediction, fetchConfidences } from '../api';
import SummaryMetrics from '../components/SummaryMetrics';
import ConfidenceChart from '../components/ConfidenceChart';
import PAEHeatmap from '../components/PAEHeatmap';
import StructureViewer from '../components/StructureViewer';
import RankingScores from '../components/RankingScores';
import PipelineStatus from '../components/PipelineStatus';

export default function PredictionDetail() {
  const { name } = useParams();
  const [prediction, setPrediction] = useState(null);
  const [confidences, setConfidences] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPrediction(name),
      fetchConfidences(name).catch(() => null),
    ])
      .then(([pred, conf]) => {
        setPrediction(pred);
        setConfidences(conf);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [name]);

  // Load sample-specific confidences
  useEffect(() => {
    if (selectedSample) {
      fetchConfidences(name, selectedSample)
        .then(setConfidences)
        .catch(() => {});
    }
  }, [selectedSample, name]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading {name}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <span style={{ color: 'var(--accent-rose)' }}>⚠ {error}</span>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="back-link">← Back to Predictions</Link>

      <div className="page-header">
        <h1 className="page-title" style={{ fontFamily: 'var(--font-mono)' }}>
          {name}
        </h1>
        <p className="page-subtitle">
          Detailed structure prediction analysis
        </p>
      </div>

      {/* Pipeline Status */}
      <div className="glass-card no-hover" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">📡 Pipeline Status</span>
        </div>
        <PipelineStatus status="completed" />
      </div>

      {/* Summary Metrics */}
      {prediction?.summary && (
        <SummaryMetrics summary={prediction.summary} />
      )}

      {/* Sample selector */}
      {prediction?.samples?.length > 0 && (
        <div className="sample-tabs">
          <button
            className={`sample-tab ${!selectedSample ? 'active' : ''}`}
            onClick={() => setSelectedSample(null)}
          >
            Merged
          </button>
          {prediction.samples.map(s => (
            <button
              key={s.name}
              className={`sample-tab ${selectedSample === s.name ? 'active' : ''}`}
              onClick={() => setSelectedSample(s.name)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* 3D Viewer + PAE side by side */}
      <div className="detail-grid">
        <div className="glass-card no-hover">
          <div className="card-header">
            <span className="card-title">🏗 3D Structure</span>
          </div>
          <StructureViewer name={name} sample={selectedSample} />
        </div>

        <div className="glass-card no-hover">
          <div className="card-header">
            <span className="card-title">🔥 Predicted Aligned Error (PAE)</span>
          </div>
          {confidences?.pae ? (
            <PAEHeatmap pae={confidences.pae} />
          ) : (
            <div className="loading-container" style={{ padding: 40 }}>
              <span style={{ color: 'var(--text-muted)' }}>PAE data not available</span>
            </div>
          )}
        </div>
      </div>

      {/* pLDDT Chart */}
      <div className="glass-card no-hover" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">📈 Per-Residue Confidence (pLDDT)</span>
        </div>
        {confidences?.atom_plddts ? (
          <ConfidenceChart plddts={confidences.atom_plddts} />
        ) : (
          <div className="loading-container" style={{ padding: 40 }}>
            <span style={{ color: 'var(--text-muted)' }}>pLDDT data not available</span>
          </div>
        )}
      </div>

      {/* Ranking Scores */}
      {prediction?.ranking_scores && (
        <div className="glass-card no-hover" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">🏆 Ranking Scores</span>
          </div>
          <RankingScores scores={prediction.ranking_scores} />
        </div>
      )}

      {/* Files */}
      <div className="glass-card no-hover">
        <div className="card-header">
          <span className="card-title">📁 Output Files</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {prediction?.files?.map(f => (
            <div
              key={f.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,0,0,0.2)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--accent-teal)' }}>{f.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {(f.size_bytes / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
