import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(tenantId: string, data: { url: string; events: string[] }) {
    return this.prisma.webhookEndpoint.create({
      data: {
        id: randomUUID(),
        tenantId,
        url: data.url,
        eventsJson: data.events,
        secret: randomUUID().replace(/-/g, ''),
        isActive: true,
      },
    });
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const ep = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!ep) throw new NotFoundException('Webhook not found');
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        url: data.url as string | undefined,
        eventsJson: data.events as object | undefined,
        isActive: data.isActive as boolean | undefined,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const ep = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!ep) throw new NotFoundException('Webhook not found');
    await this.prisma.webhookEndpoint.delete({ where: { id } });
    return { ok: true };
  }

  /** Fire-and-forget webhook delivery to matching endpoints. */
  emitWebhook(tenantId: string, event: string, payload: object) {
    void this.deliver(tenantId, event, payload).catch((err) =>
      this.logger.warn(`Webhook emit failed: ${String(err)}`),
    );
  }

  private async deliver(tenantId: string, event: string, payload: object) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { tenantId, isActive: true },
    });

    const body = JSON.stringify({
      id: randomUUID(),
      event,
      tenantId,
      createdAt: new Date().toISOString(),
      data: payload,
    });

    await Promise.all(
      endpoints.map(async (ep) => {
        const events = (ep.eventsJson as string[]) || [];
        if (!events.includes(event) && !events.includes('*')) return;
        const signature = createHmac('sha256', ep.secret).update(body).digest('hex');
        await this.deliverWithRetry(ep.id, ep.url, event, body, signature);
      }),
    );
  }

  private async deliverWithRetry(
    id: string,
    url: string,
    event: string,
    body: string,
    signature: string,
    attempts = 3,
  ) {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Omni-Event': event,
            'X-Omni-Signature': signature,
            'X-Omni-Attempt': String(i + 1),
          },
          body,
        });
        if (res.ok || res.status < 500) return;
        lastError = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastError = err;
      }
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
    this.logger.warn(`Webhook ${id} failed after ${attempts} attempts: ${String(lastError)}`);
  }
}
