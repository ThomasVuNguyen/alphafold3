export default function SummaryMetrics({ summary }) {
  if (!summary) return null;

  const metrics = [
    {
      label: 'pTM',
      value: summary.ptm,
      tooltip: 'Predicted TM-score — global fold accuracy',
    },
    {
      label: 'ipTM',
      value: summary.iptm,
      tooltip: 'Interface pTM — complex/binding interface quality',
    },
    {
      label: 'Ranking Score',
      value: summary.ranking_score,
      tooltip: 'Overall model ranking score',
    },
    {
      label: 'Fraction Disordered',
      value: summary.fraction_disordered,
      tooltip: 'Fraction of residues predicted as disordered',
      invert: true, // lower is better
    },
  ];

  function getClass(val, invert = false) {
    if (val === undefined || val === null) return '';
    if (invert) {
      return val <= 0.1 ? 'good' : val <= 0.3 ? '' : 'warning';
    }
    return val >= 0.8 ? 'good' : val >= 0.5 ? '' : 'warning';
  }

  return (
    <div className="metrics-grid">
      {metrics.map(m => (
        <div className="metric-card" key={m.label} title={m.tooltip}>
          <div className="metric-label">{m.label}</div>
          <div className={`metric-value ${getClass(m.value, m.invert)}`}>
            {m.value !== undefined && m.value !== null
              ? m.value.toFixed(3)
              : '—'}
          </div>
          <div className="metric-subtext">{m.tooltip}</div>
        </div>
      ))}
      {summary.has_clash !== undefined && (
        <div className="metric-card" title="Steric clash detection">
          <div className="metric-label">Clash</div>
          <div className={`metric-value ${summary.has_clash ? 'warning' : 'good'}`}>
            {summary.has_clash ? 'Yes' : 'No'}
          </div>
          <div className="metric-subtext">Steric clash detected</div>
        </div>
      )}
    </div>
  );
}
