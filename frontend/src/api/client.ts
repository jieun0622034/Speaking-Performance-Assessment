export interface ApiHealth {
  status: 'UP';
  service: string;
  database: 'UP';
}

export async function getApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const response = await fetch('/api/health', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`API 연결 실패 (HTTP ${response.status})`);
  const data = await response.json();
  if (data.status !== 'UP' || data.database !== 'UP' || typeof data.service !== 'string') {
    throw new Error('API 또는 DB가 준비되지 않았습니다.');
  }
  return data;
}
