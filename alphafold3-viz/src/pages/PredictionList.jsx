import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPredictions } from '../api';

function getScoreColor(score) {
  if (score >= 0.8) return 'good';
  if (score >= 0.5) return '';
  return 'warning';
}

export default function PredictionList() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPredictions()
      .then(data => {
        setPredictions(data.predictions || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading predictions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <span style={{ color: 'var(--accent-rose)' }}>⚠ {error}</span>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Make sure the API server is running: <code>uvicorn api_server:app --reload --port 8000</code>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🧬 Predictions</h1>
        <p className="page-subtitle">
          Browse completed AlphaFold3 structure predictions. {predictions.length} prediction{predictions.length !== 1 ? 's' : ''} found.
        </p>
      </div>

      <div className="prediction-grid">
        {predictions.map(pred => (
          <Link
            key={pred.name}
            to={`/prediction/${pred.name}`}
            style={{ textDecoration: 'none' }}
          >
            <div className="glass-card prediction-card">
              <div className="pred-name">{pred.name}</div>

              <div className="pred-meta">
                {pred.has_structure && (
                  <span className="badge badge-teal">🏗 Structure</span>
                )}
                {pred.has_confidences && (
                  <span className="badge badge-violet">📊 Confidences</span>
                )}
                {pred.samples.length > 0 && (
                  <span className="badge badge-amber">
                    {pred.samples.length} sample{pred.samples.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {pred.summary && (
                <div className="pred-scores">
                  {pred.summary.ptm != null && (
                    <div className="pred-score">
                      <span className={`score-value metric-value ${getScoreColor(pred.summary.ptm)}`}>
                        {pred.summary.ptm.toFixed(2)}
                      </span>
                      <span className="score-label">pTM</span>
                    </div>
                  )}
                  {pred.summary.iptm != null && (
                    <div className="pred-score">
                      <span className={`score-value metric-value ${getScoreColor(pred.summary.iptm)}`}>
                        {pred.summary.iptm.toFixed(2)}
                      </span>
                      <span className="score-label">ipTM</span>
                    </div>
                  )}
                  {pred.summary.ranking_score != null && (
                    <div className="pred-score">
                      <span className={`score-value metric-value ${getScoreColor(pred.summary.ranking_score)}`}>
                        {pred.summary.ranking_score.toFixed(2)}
                      </span>
                      <span className="score-label">Ranking</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
