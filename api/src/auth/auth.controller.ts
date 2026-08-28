import { Controller, Post, Body, UseGuards, Get, Request, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @UseGuards(AuthGuard('local'))
  // 5 login attempts per minute per IP — prevents brute-force
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async login(@Request() req: any) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress;
    return this.auth.login(req.user, ip);
  }

  @Get('me')
  me(@Request() req: any) {
    return this.auth.me(req.user.id);
  }

  @Post('change-password')
  @HttpCode(200)
  // 3 password change attempts per minute
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  changePassword(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  refresh(@Request() req: any) {
    // Extract user id from the token manually — token may be expired
    // so we cannot use JwtAuthGuard here; validation happens in auth.service
    const authHeader = req.headers['authorization'] ?? '';
    const token = authHeader.replace('Bearer ', '');
    return this.auth.refreshFromToken(token);
  }
}
