const API_BASE = 'http://localhost:8001/api';

export async function fetchPredictions() {
  const res = await fetch(`${API_BASE}/predictions`);
  if (!res.ok) throw new Error('Failed to fetch predictions');
  const data = await res.json();
  return data.predictions || [];
}

export async function fetchPrediction(name) {
  const res = await fetch(`${API_BASE}/predictions/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch prediction: ${name}`);
  return res.json();
}

export async function fetchConfidences(name, sample = null) {
  const url = sample
    ? `${API_BASE}/predictions/${name}/confidences?sample=${sample}`
    : `${API_BASE}/predictions/${name}/confidences`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch confidences');
  return res.json();
}

export function getStructureUrl(name, sample = null) {
  return sample
    ? `${API_BASE}/predictions/${name}/structure?sample=${sample}`
    : `${API_BASE}/predictions/${name}/structure`;
}

export async function fetchRanking(name) {
  const res = await fetch(`${API_BASE}/predictions/${name}/ranking`);
  if (!res.ok) throw new Error('Failed to fetch ranking');
  const data = await res.json();
  return data.ranking_scores || [];
}

// --- Pipeline Execution ---

export async function submitPrediction(inputJson) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputJson),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || err);
    throw new Error(detail || `Prediction failed (${res.status})`);
  }
  return res.json();
}

export async function fetchJobStatus(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch job status');
  return res.json();
}

export async function fetchJobs() {
  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  const data = await res.json();
  return data.jobs || [];
}
