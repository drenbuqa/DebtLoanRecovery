import { Controller, Get, Post, Request } from '@nestjs/common';
import { ConfidentialityService } from './confidentiality.service';

@Controller('confidentiality')
export class ConfidentialityController {
  constructor(private svc: ConfidentialityService) {}

  @Get('status')
  getStatus(@Request() req: any) {
    return this.svc.getStatus(req.user.id);
  }

  @Post('accept')
  accept(@Request() req: any) {
    return this.svc.accept(req.user.id);
  }
}
