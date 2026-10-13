import { QrService } from './qr.service';

describe('QrService', () => {
  const service = new QrService();

  it('builds UPI payload with amount and reference', () => {
    const payload = service.buildUpiPayload({
      pa: 'merchant@upi',
      am: 499.5,
      tn: 'ORDER-REF-1',
      pn: 'Demo Store',
    });
    expect(payload.startsWith('upi://pay?')).toBe(true);
    expect(payload).toContain('pa=merchant%40upi');
    expect(payload).toContain('am=499.5');
    expect(payload).toContain('tn=ORDER-REF-1');
  });

  it('generates a data URL QR image', async () => {
    const result = await service.generateUpiQr({
      pa: 'merchant@upi',
      am: 100,
      tn: 'REF',
    });
    expect(result.qrPayload).toContain('upi://pay');
    expect(result.qrCodeUrl.startsWith('data:')).toBe(true);
  });
});
