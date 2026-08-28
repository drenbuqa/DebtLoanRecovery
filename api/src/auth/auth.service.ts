import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 15;

function validatePasswordStrength(password: string): void {
  if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) throw new BadRequestException('Password must contain at least one uppercase letter');
  if (!/[0-9]/.test(password)) throw new BadRequestException('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) throw new BadRequestException('Password must contain at least one special character');
}

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, passwordHash: true, fullName: true,
        role: true, officeId: true, email: true, isActive: true,
        tokenVersion: true, failedLoginAttempts: true, lockedUntil: true,
      },
    });

    if (!user) {
      await this.audit.log({ action: 'LOGIN_FAILED', details: `Unknown username: ${username}` });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lockout before anything else
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      await this.audit.log({ userId: user.id, username: user.username, action: 'LOGIN_BLOCKED', details: `Account locked for ${remaining} more minute(s)` });
      throw new ForbiddenException(`Account temporarily locked. Try again in ${remaining} minute(s)`);
    }

    if (!user.isActive) {
      await this.audit.log({ userId: user.id, username: user.username, action: 'LOGIN_BLOCKED', details: 'Account inactive' });
      throw new UnauthorizedException('Account is inactive');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : undefined,
        },
      });
      await this.audit.log({
        userId: user.id, username: user.username, action: 'LOGIN_FAILED',
        details: lock ? `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts` : `Failed attempt ${attempts}/${MAX_FAILED_ATTEMPTS}`,
      });
      if (lock) throw new ForbiddenException(`Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful — reset lockout counters
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return user;
  }

  async login(user: { id: string; username: string; role: string; fullName: string; officeId: string | null; email: string; tokenVersion: number }, ipAddress?: string) {
    const payload = { sub: user.id, username: user.username, role: user.role, officeId: user.officeId, tv: user.tokenVersion };
    await this.audit.log({ userId: user.id, username: user.username, action: 'LOGIN', ipAddress });
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role, officeId: user.officeId },
    };
  }

  async me(userId: string) {
    const user = await this.users.findOne(userId);
    if (!user) throw new Error('User not found');
    return { id: user.id, username: user.username, fullName: user.fullName, role: user.role, officeId: user.officeId, email: user.email, office: (user as any).office };
  }

  async refreshFromToken(token: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token, { ignoreExpiration: true });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    if (!payload?.sub) throw new UnauthorizedException('Invalid token');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, officeId: true, isActive: true, tokenVersion: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Account inactive or not found');

    // Reject tokens issued before a password change or forced logout
    if (payload.tv !== undefined && payload.tv !== user.tokenVersion) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    const newPayload = { sub: user.id, username: user.username, role: user.role, officeId: user.officeId, tv: user.tokenVersion };
    return { accessToken: this.jwt.sign(newPayload) };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    validatePasswordStrength(newPassword);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException('New password must differ from the current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    // Increment tokenVersion — invalidates all existing tokens across all devices
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await this.audit.log({ userId, username: user.username, action: 'PASSWORD_CHANGED' });
    return { message: 'Password updated successfully' };
  }
}
