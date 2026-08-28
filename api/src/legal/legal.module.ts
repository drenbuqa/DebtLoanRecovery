import { Module } from '@nestjs/common';
import { LegalService } from './legal.service';
import { LegalController } from './legal.controller';

@Module({ providers: [LegalService], controllers: [LegalController] })
export class LegalModule {}
