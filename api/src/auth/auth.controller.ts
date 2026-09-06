import { Controller, Post, Body, UseGuards, Get, Request, Res, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

const COOKIE_NAME = 'dlr_token';

function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: '/',
  };
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @UseGuards(AuthGuard('local'))
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async login(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress;
    const result = await this.auth.login(req.user, ip);
    res.cookie(COOKIE_NAME, result.accessToken, cookieOpts());
    // Return only user profile — token never reaches JavaScript
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out' };
  }

  @Get('me')
  me(@Request() req: any) {
    return this.auth.me(req.user.id);
  }

  @Post('change-password')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  async changePassword(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const result = await this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword);
    // Password changed — clear cookie so this session is also invalidated
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async refresh(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      res.status(401).json({ message: 'No session' });
      return;
    }
    const result = await this.auth.refreshFromToken(token);
    res.cookie(COOKIE_NAME, result.accessToken, cookieOpts());
    return { ok: true };
  }
}
