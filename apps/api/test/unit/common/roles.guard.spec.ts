import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@tawsela/shared';
import { RolesGuard } from '../../../src/common/guards/roles.guard.js';

function ctx(user: { id: number; role: Role } | undefined): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardFor(roles: Role[] | undefined) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('lets any signed-in role through a route without @Roles', () => {
    expect(guardFor(undefined).canActivate(ctx({ id: 1, role: 'driver' }))).toBe(true);
  });

  it.each(['customer', 'partner', 'driver', 'admin'] as const)('lets %s through a route made for it', (role) => {
    expect(guardFor([role]).canActivate(ctx({ id: 1, role }))).toBe(true);
  });

  it.each(['partner', 'driver', 'admin'] as const)('stops %s at a customers-only route', (role) => {
    expect(() => guardFor(['customer']).canActivate(ctx({ id: 1, role }))).toThrow(ForbiddenException);
  });

  it('stops a request without an account', () => {
    expect(() => guardFor(['admin']).canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
