import { Module } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';

@Module({ providers: [AgreementsService], controllers: [AgreementsController] })
export class AgreementsModule {}
