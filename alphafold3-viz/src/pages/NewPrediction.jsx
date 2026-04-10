import { useState } from 'react';

const EXAMPLE_INPUT = JSON.stringify({
  name: "my_protein",
  modelSeeds: [1],
  sequences: [
    {
      protein: {
        id: "A",
        sequence: "MASWSHPQFEK..."
      }
    }
  ],
  dialect: "alphafold3",
  version: 2
}, null, 2);

export default function NewPrediction() {
  const [input, setInput] = useState(EXAMPLE_INPUT);
  const [status, setStatus] = useState(null);

  const handleSubmit = async () => {
    try {
      const parsed = JSON.parse(input);
      setStatus({ type: 'info', message: 'Submitting prediction...' });

      const res = await fetch('http://localhost:8000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'Prediction submitted!' });
      } else {
        setStatus({
          type: 'warning',
          message: data.message || 'Pipeline trigger not yet available.',
        });
      }
    } catch (err) {
      setStatus({ type: 'error', message: `Invalid JSON: ${err.message}` });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">➕ New Prediction</h1>
        <p className="page-subtitle">
          Submit a protein sequence for AlphaFold3 structure prediction.
          Pipeline runs server-side — no cloud endpoints are exposed.
        </p>
      </div>

      <div className="glass-card no-hover" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">📝 Input JSON</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setInput(EXAMPLE_INPUT)}
            >
              Reset
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              🚀 Submit Prediction
            </button>
          </div>
        </div>

        <textarea
          className="sequence-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={16}
          spellCheck={false}
        />

        {status && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              background:
                status.type === 'error' ? 'rgba(244, 63, 94, 0.1)' :
                status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                status.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                'rgba(20, 184, 166, 0.1)',
              color:
                status.type === 'error' ? 'var(--accent-rose)' :
                status.type === 'success' ? 'var(--accent-emerald)' :
                status.type === 'warning' ? 'var(--accent-amber)' :
                'var(--accent-teal)',
              border: `1px solid ${
                status.type === 'error' ? 'rgba(244, 63, 94, 0.2)' :
                status.type === 'success' ? 'rgba(16, 185, 129, 0.2)' :
                status.type === 'warning' ? 'rgba(245, 158, 11, 0.2)' :
                'rgba(20, 184, 166, 0.2)'
              }`,
            }}
          >
            {status.message}
          </div>
        )}
      </div>

      <div className="glass-card no-hover">
        <div className="card-header">
          <span className="card-title">ℹ️ Input Format Guide</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p>The input JSON follows the AlphaFold3 format:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li><strong>name</strong> — Job identifier (alphanumeric + underscores)</li>
            <li><strong>modelSeeds</strong> — Random seeds for sampling (array of ints)</li>
            <li><strong>sequences</strong> — Array of chain sequences (protein, RNA, DNA, ligand)</li>
            <li><strong>dialect</strong> — Must be <code style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>"alphafold3"</code></li>
            <li><strong>version</strong> — Schema version, currently <code style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>2</code></li>
          </ul>
          <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 12 }}>
            🔒 All pipeline execution (MSA search, Modal inference) happens server-side.
            No cloud URLs or API keys are sent to this browser.
          </p>
        </div>
      </div>
    </div>
  );
}
