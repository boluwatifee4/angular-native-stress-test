import { describe, it, expect, beforeEach } from 'vitest';
import { app, resetServerStats } from '../server/src/index';

describe('Server Hono API & Idempotency Tests', () => {
  beforeEach(() => {
    resetServerStats();
  });

  it('serves initial report and increments modelCalls to 1', async () => {
    const payload = { id: 'uuid-server-test-1', note: 'Beam hairline crack' };
    const res = await app.request('/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('x-idempotent-hit')).toBeNull();

    const statsRes = await app.request('/stats');
    const stats = (await statsRes.json()) as { modelCalls: number; idempotencyHits: number; cachedReportsCount: number };
    expect(stats.modelCalls).toBe(1);
    expect(stats.idempotencyHits).toBe(0);
    expect(stats.cachedReportsCount).toBe(1);
  });

  it('returns cached response on duplicate UUID and prevents duplicate model calls', async () => {
    const payload = { id: 'uuid-server-test-2', note: 'Roof edge damage' };

    // First request: processes report and increments modelCalls
    const res1 = await app.request('/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res1.status).toBe(200);
    expect(res1.headers.get('x-idempotent-hit')).toBeNull();

    // Second request with identical UUID: hits idempotency cache without secondary model call
    const res2 = await app.request('/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res2.status).toBe(200);
    expect(res2.headers.get('x-idempotent-hit')).toBe('true');

    const json1 = await res1.json();
    const json2 = await res2.json();
    expect(json1).toEqual(json2);

    // Verify stats: exactly 1 model call, 1 idempotency hit (0 duplicate model calls)
    const statsRes = await app.request('/stats');
    const stats = (await statsRes.json()) as { modelCalls: number; idempotencyHits: number; cachedReportsCount: number };
    expect(stats.modelCalls).toBe(1);
    expect(stats.idempotencyHits).toBe(1);
    expect(stats.cachedReportsCount).toBe(1);
  });
});
