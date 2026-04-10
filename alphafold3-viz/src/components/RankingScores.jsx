import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div
      style={{
        background: 'rgba(10, 14, 26, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div style={{ color: '#94a3b8', marginBottom: 6 }}>{data.label}</div>
      <div style={{ color: '#14b8a6', fontWeight: 700, fontSize: 18 }}>
        {parseFloat(data.ranking_score).toFixed(4)}
      </div>
    </div>
  );
}

export default function RankingScores({ scores }) {
  if (!scores || scores.length === 0) return null;

  const data = scores.map((row, i) => ({
    label: `seed-${row.seed || i + 1}_sample-${row.sample || i}`,
    ranking_score: parseFloat(row.ranking_score || row.ranking || 0),
    seed: row.seed,
    sample: row.sample,
  }));

  const maxScore = Math.max(...data.map(d => d.ranking_score));

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="label"
            stroke="var(--text-muted)"
            fontSize={10}
            tickLine={false}
            angle={-25}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="ranking_score" radius={[4, 4, 0, 0]} animationDuration={600}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.ranking_score === maxScore
                    ? '#14b8a6'
                    : 'rgba(20, 184, 166, 0.4)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
