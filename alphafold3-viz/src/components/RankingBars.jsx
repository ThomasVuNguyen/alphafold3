/**
 * RankingBars — plain-div bar chart for ranking scores per sample.
 * Replaces Recharts BarChart for a lighter, denser look.
 */
export default function RankingBars({ scores }) {
  if (!scores || scores.length === 0) return null;

  const data = scores.map((row, i) => ({
    label: `s${row.seed || 1}_${row.sample ?? i}`,
    score: parseFloat(row.ranking_score || row.ranking || 0),
  }));

  const maxScore = Math.max(...data.map(d => d.score), 0.01);

  return (
    <div className="ranking-bars">
      {data.map((d, i) => {
        const pct = (d.score / maxScore) * 100;
        const isBest = d.score === maxScore;
        return (
          <div className="ranking-bar-item" key={i}>
            <span className="ranking-bar-value">{d.score.toFixed(3)}</span>
            <div
              className={`ranking-bar ${isBest ? 'best' : 'normal'}`}
              style={{ height: `${pct}%` }}
            />
            <span className="ranking-bar-label">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
