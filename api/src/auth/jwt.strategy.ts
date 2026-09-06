import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

function extractFromCookie(req: Request): string | null {
  return req?.cookies?.['dlr_token'] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    cfg: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractFromCookie]),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET', 'changeme'),
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, officeId: true, isActive: true, tokenVersion: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Account inactive');
    // Reject tokens issued before a password change (tokenVersion mismatch)
    if (payload.tv !== undefined && payload.tv !== user.tokenVersion) {
      throw new UnauthorizedException('Token has been invalidated');
    }
    return { id: user.id, username: user.username, role: user.role, officeId: user.officeId };
  }
}
