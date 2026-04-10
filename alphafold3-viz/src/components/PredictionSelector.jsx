import { useState, useEffect, useRef } from 'react';
import { fetchPredictions, submitPrediction, fetchJobStatus } from '../api';

// ---------------------------------------------------------------------------
// Example presets — real proteins beginners can test right away
// ---------------------------------------------------------------------------
const EXAMPLES = [
  {
    label: '🟢 Insulin B-chain',
    desc: '30 residues · ~3 min · simple peptide',
    json: {
      name: 'insulin_b_chain',
      dialect: 'alphafold3',
      version: 4,
      modelSeeds: [1],
      sequences: [
        {
          protein: {
            id: 'A',
            sequence: 'FVNQHLCGSHLVEALYLVCGERGFFYTPKT',
          },
        },
      ],
    },
  },
  {
    label: '🟡 Lysozyme',
    desc: '129 residues · ~8 min · classic enzyme',
    json: {
      name: 'hen_lysozyme',
      dialect: 'alphafold3',
      version: 4,
      modelSeeds: [1],
      sequences: [
        {
          protein: {
            id: 'A',
            sequence:
              'KVFGRCELAAAMKRHGLDNYRGYSLGNWVCAAKFESNFNTQATNRNTDGSTDYGILQINSRWWCNDGRTPGSRNLCNIPCSALLSSDITASVNCAKKIVSDGNGMNAWVAWRNRCKGTDVQAWIRGCRL',
          },
        },
      ],
    },
  },
  {
    label: '🔴 GFP',
    desc: '238 residues · ~12 min · fluorescent barrel',
    json: {
      name: 'green_fluorescent_protein',
      dialect: 'alphafold3',
      version: 4,
      modelSeeds: [1],
      sequences: [
        {
          protein: {
            id: 'A',
            sequence:
              'MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK',
          },
        },
      ],
    },
  },
];

export default function PredictionSelector({ selected, onSelect, prediction, onSampleChange, onRefresh }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jsonInput, setJsonInput] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  function loadPredictions() {
    setLoading(true);
    fetchPredictions()
      .then(data => {
        setPredictions(data);
        if (!selected && data.length > 0) {
          onSelect(data[0].name);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  // Poll active job status
  useEffect(() => {
    if (!activeJob) return;

    pollRef.current = setInterval(async () => {
      try {
        const status = await fetchJobStatus(activeJob.job_id);
        setActiveJob(status);

        if (status.status === 'succeeded' || status.status === 'failed') {
          clearInterval(pollRef.current);
          pollRef.current = null;

          if (status.status === 'succeeded') {
            // Refresh predictions list to pick up new result
            loadPredictions();
            if (onRefresh) onRefresh();
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeJob?.job_id]);

  async function handleSubmit() {
    setSubmitError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      const result = await submitPrediction(parsed);
      setActiveJob(result);
      setJsonInput('');
    } catch (e) {
      setSubmitError(e.message);
    }
  }

  function loadExample(example) {
    setJsonInput(JSON.stringify(example.json, null, 2));
    setSubmitError(null);
  }

  const samples = prediction?.samples || [];
  const summary = prediction?.summary;

  function getScoreClass(val, invert = false) {
    if (val === null || val === undefined) return '';
    if (invert) return val <= 0.1 ? 'good' : val <= 0.3 ? 'mid' : 'low';
    return val >= 0.7 ? 'good' : val >= 0.4 ? 'mid' : 'low';
  }

  const STAGE_LABELS = {
    queued: '⏳ Queued',
    data_pipeline: '🧬 CPU Data Pipeline (MSA search, 620GB DBs)',
    downloading_msa: '⬇️ Downloading MSA results',
    gpu_inference: '🚀 GPU Inference (Modal A100)',
    complete: '✅ Complete',
  };

  return (
    <div className="panel-left">
      {/* Brand */}
      <div className="panel-brand">
        <h1>AlphaFold3 Tinker</h1>
        <div className="subtitle">Structure prediction visualizer</div>
      </div>

      {/* Predictions list */}
      <div className="section-header">Predictions</div>
      {loading ? (
        <div className="state-loading" style={{ padding: 20 }}>
          <div className="spin-dot" />
        </div>
      ) : (
        <div className="pred-list">
          {predictions.map(p => (
            <div
              key={p.name}
              className={`pred-item ${selected === p.name ? 'active' : ''}`}
              onClick={() => onSelect(p.name)}
            >
              <div className="pred-name">{p.name}</div>
              <div className="pred-score-mini">
                {p.summary?.ptm != null && (
                  <span>pTM {p.summary.ptm.toFixed(2)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick metrics */}
      {summary && (
        <div className="quick-metrics">
          <div className="quick-metric">
            <div className={`qm-value ${getScoreClass(summary.ptm)}`}>
              {summary.ptm != null ? summary.ptm.toFixed(3) : '—'}
            </div>
            <div className="qm-label">pTM</div>
          </div>
          <div className="quick-metric">
            <div className={`qm-value ${getScoreClass(summary.iptm)}`}>
              {summary.iptm != null ? summary.iptm.toFixed(3) : '—'}
            </div>
            <div className="qm-label">ipTM</div>
          </div>
          <div className="quick-metric">
            <div className={`qm-value ${getScoreClass(summary.ranking_score)}`}>
              {summary.ranking_score != null ? summary.ranking_score.toFixed(3) : '—'}
            </div>
            <div className="qm-label">Ranking</div>
          </div>
          <div className="quick-metric">
            <div className={`qm-value ${getScoreClass(summary.fraction_disordered, true)}`}>
              {summary.fraction_disordered != null ? summary.fraction_disordered.toFixed(3) : '—'}
            </div>
            <div className="qm-label">Disordered</div>
          </div>
        </div>
      )}

      {/* Sample selector */}
      {samples.length > 0 && (
        <>
          <div className="section-header">Samples</div>
          <div className="sample-section">
            <div className="sample-tabs-compact">
              <button
                className={`sample-tab-sm ${!prediction._selectedSample ? 'active' : ''}`}
                onClick={() => onSampleChange(null)}
              >
                merged
              </button>
              {samples.map(s => (
                <button
                  key={s.name}
                  className={`sample-tab-sm ${prediction._selectedSample === s.name ? 'active' : ''}`}
                  onClick={() => onSampleChange(s.name)}
                >
                  {s.name.replace('seed-1_', 's')}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Active Job Status */}
      {activeJob && activeJob.status !== 'succeeded' && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #262626' }}>
          <div className="section-header-flush">Running Job</div>
          <div style={{
            padding: '8px 10px',
            borderRadius: 6,
            background: activeJob.status === 'failed' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)',
            border: `1px solid ${activeJob.status === 'failed' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.15)'}`,
            fontSize: 11,
            fontFamily: 'ui-monospace, monospace',
          }}>
            <div style={{ color: '#d4d4d4', marginBottom: 4, fontWeight: 600 }}>
              {activeJob.name}
            </div>
            <div style={{ color: activeJob.status === 'failed' ? '#fca5a5' : '#10b981' }}>
              {STAGE_LABELS[activeJob.stage] || activeJob.stage}
            </div>
            {activeJob.status === 'running' && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="spin-dot" style={{ width: 10, height: 10 }} />
                <span style={{ color: '#525252' }}>Processing…</span>
              </div>
            )}
            {activeJob.status === 'failed' && activeJob.error && (
              <div style={{ color: '#fca5a5', marginTop: 4, fontSize: 10 }}>
                {activeJob.error}
              </div>
            )}
            {activeJob.logs?.length > 0 && (
              <div style={{
                marginTop: 6,
                maxHeight: 80,
                overflow: 'auto',
                fontSize: 9,
                color: '#525252',
                lineHeight: 1.4,
              }}>
                {activeJob.logs.slice(-5).map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Prediction */}
      <div className="new-pred-section">
        <div className="section-header-flush">New prediction</div>

        {/* Example presets */}
        <div className="example-presets">
          <div className="example-label">Examples — click to load</div>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              className="example-chip"
              onClick={() => loadExample(ex)}
            >
              <span className="example-chip-label">{ex.label}</span>
              <span className="example-chip-desc">{ex.desc}</span>
            </button>
          ))}
        </div>

        <textarea
          className="input-mini"
          placeholder='Paste AF3 JSON or click an example above ↑'
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          rows={4}
        />
        {submitError && (
          <div style={{ color: '#fca5a5', fontSize: 11, marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>
            {submitError}
          </div>
        )}
        <button
          className="btn-run"
          disabled={!jsonInput.trim() || (activeJob && activeJob.status === 'running')}
          onClick={handleSubmit}
        >
          {activeJob?.status === 'running' ? 'Pipeline running…' : 'Run prediction'}
        </button>
      </div>

      {/* Security */}
      <div className="security-badge">
        <span className="lock-icon">🔒</span>
        Pipeline endpoints are server-side only
      </div>
    </div>
  );
}
