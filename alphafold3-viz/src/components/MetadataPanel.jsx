export default function MetadataPanel({ prediction, confidences }) {
  if (!prediction) {
    return (
      <aside className="panel-right">
        <div className="section-header-flush">Metadata</div>
        <div style={{ fontSize: 12, color: '#525252' }}>Select a prediction</div>
      </aside>
    );
  }

  const summary = prediction.summary;
  const files = prediction.files || [];
  const paeSize = confidences?.pae?.length || 0;
  const atomCount = confidences?.atom_plddts?.length || 0;

  function valClass(val, invert = false) {
    if (val == null) return '';
    if (invert) return val <= 0.1 ? 'good' : val <= 0.3 ? 'mid' : 'low';
    return val >= 0.7 ? 'good' : val >= 0.4 ? 'mid' : 'low';
  }

  const stages = ['Data Pipeline', 'MSA Search', 'GPU Inference', 'Post-process'];

  return (
    <aside className="panel-right">
      {/* Confidence Metrics */}
      <div className="meta-block">
        <div className="section-header-flush">Confidence</div>
        {summary && (
          <>
            <div className="meta-row">
              <span className="meta-key">pTM</span>
              <span className={`meta-val ${valClass(summary.ptm)}`}>
                {summary.ptm != null ? summary.ptm.toFixed(4) : '—'}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-key">ipTM</span>
              <span className={`meta-val ${valClass(summary.iptm)}`}>
                {summary.iptm != null ? summary.iptm.toFixed(4) : '—'}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-key">Ranking</span>
              <span className={`meta-val ${valClass(summary.ranking_score)}`}>
                {summary.ranking_score != null ? summary.ranking_score.toFixed(4) : '—'}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-key">Disordered</span>
              <span className={`meta-val ${valClass(summary.fraction_disordered, true)}`}>
                {summary.fraction_disordered != null ? summary.fraction_disordered.toFixed(4) : '—'}
              </span>
            </div>
            {summary.has_clash !== undefined && (
              <div className="meta-row">
                <span className="meta-key">Clash</span>
                <span className={`meta-val ${summary.has_clash ? 'low' : 'good'}`}>
                  {summary.has_clash ? 'yes' : 'no'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Data Summary */}
      <div className="meta-block">
        <div className="section-header-flush">Data</div>
        <div className="meta-row">
          <span className="meta-key">Atoms</span>
          <span className="meta-val">{atomCount > 0 ? atomCount.toLocaleString() : '—'}</span>
        </div>
        <div className="meta-row">
          <span className="meta-key">PAE matrix</span>
          <span className="meta-val">{paeSize > 0 ? `${paeSize}×${paeSize}` : '—'}</span>
        </div>
        <div className="meta-row">
          <span className="meta-key">Samples</span>
          <span className="meta-val">{prediction.samples?.length || 0}</span>
        </div>
      </div>

      {/* Pipeline */}
      <div className="meta-block">
        <div className="section-header-flush">Pipeline</div>
        <div className="pipeline-inline">
          {stages.map(s => (
            <span key={s} className="pipe-badge done">✓ {s}</span>
          ))}
        </div>
      </div>

      {/* pLDDT Legend */}
      <div className="meta-block">
        <div className="section-header-flush">pLDDT scale</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[
            { color: '#0053D6', label: 'Very high (>90)' },
            { color: '#65CBF3', label: 'High (70–90)' },
            { color: '#FFDB13', label: 'Low (50–70)' },
            { color: '#FF7D45', label: 'Very low (<50)' },
          ].map(t => (
            <div key={t.label} className="legend-chip">
              <div className="legend-dot" style={{ background: t.color }} />
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Files */}
      <div className="meta-block">
        <div className="section-header-flush">Output files</div>
        <div className="file-list">
          {files.map(f => (
            <div key={f.name} className="file-row">
              <span className="fname" title={f.name}>{f.name}</span>
              <span className="fsize">{(f.size_bytes / 1024).toFixed(0)}K</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
