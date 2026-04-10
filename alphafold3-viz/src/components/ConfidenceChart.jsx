import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

// pLDDT color thresholds
const THRESHOLDS = [
  { min: 90, color: '#0053d6', label: 'Very High (>90)' },
  { min: 70, color: '#65cbf3', label: 'High (70-90)' },
  { min: 50, color: '#ffdb13', label: 'Low (50-70)' },
  { min: 0, color: '#ff7d45', label: 'Very Low (<50)' },
];

function getPlddtColor(val) {
  if (val >= 90) return '#0053d6';
  if (val >= 70) return '#65cbf3';
  if (val >= 50) return '#ffdb13';
  return '#ff7d45';
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.[0]) return null;
  const val = payload[0].value;
  return (
    <div
      style={{
        background: 'rgba(10, 14, 26, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>Residue {label}</div>
      <div style={{ color: getPlddtColor(val), fontWeight: 700, fontSize: 16 }}>
        {val.toFixed(1)}
      </div>
    </div>
  );
}

export default function ConfidenceChart({ plddts }) {
  const data = useMemo(() => {
    if (!plddts || plddts.length === 0) return [];
    return plddts.map((val, i) => ({
      residue: i + 1,
      plddt: val,
    }));
  }, [plddts]);

  if (data.length === 0) {
    return <div className="loading-container"><span>No pLDDT data</span></div>;
  }

  // Downsample for very long sequences
  const displayData = data.length > 1000
    ? data.filter((_, i) => i % Math.ceil(data.length / 1000) === 0)
    : data;

  const avgPlddt = plddts.reduce((a, b) => a + b, 0) / plddts.length;

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16,
        padding: '0 8px',
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {plddts.length} atoms
        </span>
        <span style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: 13,
          color: getPlddtColor(avgPlddt),
          fontWeight: 600,
        }}>
          avg: {avgPlddt.toFixed(1)}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="plddtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="residue"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 70, 90, 100]}
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={90} stroke="#0053d6" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={70} stroke="#65cbf3" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={50} stroke="#ffdb13" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Area
            type="monotone"
            dataKey="plddt"
            stroke="#14b8a6"
            strokeWidth={1.5}
            fill="url(#plddtGradient)"
            dot={false}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="viewer-legend" style={{ justifyContent: 'center' }}>
        {THRESHOLDS.map(t => (
          <div className="legend-item" key={t.label}>
            <div className="legend-swatch" style={{ background: t.color }} />
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}
