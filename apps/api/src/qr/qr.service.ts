import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  buildUpiPayload(input: {
    pa: string;
    am: number | string;
    tn: string;
    pn?: string;
    cu?: string;
  }) {
    const params = new URLSearchParams({
      pa: input.pa,
      am: String(input.am),
      tn: input.tn,
      cu: input.cu || 'INR',
    });
    if (input.pn) params.set('pn', input.pn);
    return `upi://pay?${params.toString()}`;
  }

  async generateUpiQr(input: {
    pa: string;
    am: number | string;
    tn: string;
    pn?: string;
    cu?: string;
  }) {
    const qrPayload = this.buildUpiPayload(input);
    let qrCodeUrl: string;
    try {
      qrCodeUrl = await QRCode.toDataURL(qrPayload);
    } catch {
      qrCodeUrl = `data:text/plain;base64,${Buffer.from(qrPayload).toString('base64')}`;
    }
    return { qrPayload, qrCodeUrl };
  }
}
