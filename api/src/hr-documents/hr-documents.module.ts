import { Module } from '@nestjs/common';
import { HrDocumentsService } from './hr-documents.service';
import { HrDocumentsController } from './hr-documents.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [HrDocumentsService],
  controllers: [HrDocumentsController],
})
export class HrDocumentsModule {}

