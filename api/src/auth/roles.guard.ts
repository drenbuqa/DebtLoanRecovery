import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

// Usage: @RequireRoles('ADMIN', 'MANAGER')
export function RequireRoles(...roles: string[]) {
  return (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor?.value ?? target);
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>(ROLES_KEY, ctx.getHandler());
    if (!roles || roles.length === 0) return true; // no restriction
    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Nuk keni leje të mjaftueshme për këtë veprim');
    }
    return true;
  }
}
