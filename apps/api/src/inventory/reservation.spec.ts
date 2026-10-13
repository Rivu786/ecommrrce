/**
 * Inventory reservation helper logic (unit-level).
 * Checkout locks stock for 15 minutes; expiry releases reserved qty.
 */
describe('Inventory reservation TTL', () => {
  const LOCK_MS = 15 * 60 * 1000;

  function expiresAt(from = Date.now()) {
    return new Date(from + LOCK_MS);
  }

  function isExpired(expires: Date, now = Date.now()) {
    return expires.getTime() <= now;
  }

  it('locks for 15 minutes', () => {
    const start = Date.parse('2026-08-15T10:00:00.000Z');
    const exp = expiresAt(start);
    expect(exp.toISOString()).toBe('2026-08-15T10:15:00.000Z');
  });

  it('detects expired locks', () => {
    const exp = new Date('2026-08-15T10:15:00.000Z');
    expect(isExpired(exp, Date.parse('2026-08-15T10:16:00.000Z'))).toBe(true);
    expect(isExpired(exp, Date.parse('2026-08-15T10:14:00.000Z'))).toBe(false);
  });
});
