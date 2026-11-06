import { Module } from '@nestjs/common';
import { ConfidentialityService } from './confidentiality.service';
import { ConfidentialityController } from './confidentiality.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ConfidentialityService],
  controllers: [ConfidentialityController],
})
export class ConfidentialityModule {}
