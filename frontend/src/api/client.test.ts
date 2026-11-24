import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiHealth } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('Spring Boot health API contract', () => {
  it('reads API and database readiness through the same-origin proxy', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'UP', service: 'speaking-assessment-api', database: 'UP',
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await getApiHealth()).toEqual({
      status: 'UP', service: 'speaking-assessment-api', database: 'UP',
    });
    expect(fetch.mock.calls[0][0]).toBe('/api/health');
  });
  it('rejects a backend error instead of reporting a successful connection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await expect(getApiHealth()).rejects.toThrow('HTTP 503');
  });
  it('rejects incomplete readiness responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"status":"UP"}')));
    await expect(getApiHealth()).rejects.toThrow('준비되지 않았습니다');
  });
});
