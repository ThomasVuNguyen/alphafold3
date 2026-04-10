const STAGES = [
  { key: 'input', label: 'Input', icon: '📝' },
  { key: 'msa', label: 'MSA Search', icon: '🔬' },
  { key: 'gpu', label: 'GPU Inference', icon: '⚡' },
  { key: 'done', label: 'Complete', icon: '✅' },
];

const STATUS_MAP = {
  pending: { input: 'pending', msa: 'pending', gpu: 'pending', done: 'pending' },
  input: { input: 'active', msa: 'pending', gpu: 'pending', done: 'pending' },
  msa: { input: 'completed', msa: 'active', gpu: 'pending', done: 'pending' },
  gpu: { input: 'completed', msa: 'completed', gpu: 'active', done: 'pending' },
  completed: { input: 'completed', msa: 'completed', gpu: 'completed', done: 'completed' },
  failed: { input: 'completed', msa: 'completed', gpu: 'completed', done: 'pending' },
};

export default function PipelineStatus({ status = 'completed' }) {
  const stageStates = STATUS_MAP[status] || STATUS_MAP.completed;

  return (
    <div className="pipeline-steps">
      {STAGES.map((stage, i) => (
        <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div className={`pipeline-step ${stageStates[stage.key]}`} style={{ flex: 1 }}>
            <div className={`step-icon ${stageStates[stage.key]}`}>
              {stageStates[stage.key] === 'completed' ? '✓' :
               stageStates[stage.key] === 'active' ? '⟳' :
               stage.icon}
            </div>
            <div className="step-label">{stage.label}</div>
          </div>
          {i < STAGES.length - 1 && (
            <div
              className={`step-connector ${stageStates[stage.key] === 'completed' ? 'completed' : ''}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
