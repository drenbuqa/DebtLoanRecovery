import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const CONFIDENTIALITY_VERSION = '1.0';

@Injectable()
export class ConfidentialityService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const acceptance = await this.prisma.confidentialityAcceptance.findUnique({
      where: { userId },
    });
    const accepted = acceptance?.version === CONFIDENTIALITY_VERSION;
    return { accepted, currentVersion: CONFIDENTIALITY_VERSION };
  }

  async accept(userId: string) {
    await this.prisma.confidentialityAcceptance.upsert({
      where: { userId },
      create: { userId, version: CONFIDENTIALITY_VERSION },
      update: { version: CONFIDENTIALITY_VERSION, acceptedAt: new Date() },
    });
    return { accepted: true, version: CONFIDENTIALITY_VERSION };
  }
}
