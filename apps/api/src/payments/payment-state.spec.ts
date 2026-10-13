import { PaymentStatus } from '@omnicommerce/shared';

describe('Payment state machine', () => {
  const allowed: Record<string, string[]> = {
    [PaymentStatus.PENDING]: [PaymentStatus.SUBMITTED, PaymentStatus.REJECTED],
    [PaymentStatus.SUBMITTED]: [
      PaymentStatus.VERIFICATION_IN_PROGRESS,
      PaymentStatus.CONFIRMED,
      PaymentStatus.REJECTED,
    ],
    [PaymentStatus.VERIFICATION_IN_PROGRESS]: [PaymentStatus.CONFIRMED, PaymentStatus.REJECTED],
    [PaymentStatus.CONFIRMED]: [],
    [PaymentStatus.REJECTED]: [],
  };

  function canTransition(from: string, to: string) {
    return (allowed[from] || []).includes(to);
  }

  it('allows PENDING -> SUBMITTED', () => {
    expect(canTransition(PaymentStatus.PENDING, PaymentStatus.SUBMITTED)).toBe(true);
  });

  it('allows SUBMITTED -> CONFIRMED', () => {
    expect(canTransition(PaymentStatus.SUBMITTED, PaymentStatus.CONFIRMED)).toBe(true);
  });

  it('blocks CONFIRMED -> REJECTED', () => {
    expect(canTransition(PaymentStatus.CONFIRMED, PaymentStatus.REJECTED)).toBe(false);
  });

  it('blocks PENDING -> CONFIRMED', () => {
    expect(canTransition(PaymentStatus.PENDING, PaymentStatus.CONFIRMED)).toBe(false);
  });
});
