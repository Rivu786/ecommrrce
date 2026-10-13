import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    tenantId?: string | null;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    ip?: string | null;
    meta?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        ip: input.ip ?? null,
        metaJson: input.meta ?? undefined,
      },
    });
  }
}
