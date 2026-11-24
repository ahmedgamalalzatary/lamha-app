import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUser } from '../../../common/decorators/current-user.decorator.js';
import { IS_PUBLIC } from '../../../common/decorators/public.decorator.js';
import { UsersRepository } from '../../users/users.repository.js';
import type { AccessPayload } from '../auth.service.js';

/**
 * Global guard: every route needs a valid access token unless it is @Public(). The account is
 * re-read, so a deleted or disabled account, or one whose password was reset, loses access at once.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = await this.userOf(req);
    if (!user) throw new UnauthorizedException();
    req.user = user;
    return true;
  }

  private async userOf(req: Request): Promise<AuthUser | undefined> {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) return undefined;
    const payload = await this.jwt.verifyAsync<AccessPayload>(token).catch(() => undefined);
    if (payload?.typ !== 'access') return undefined;
    const row = await this.users.findLiveById(payload.sub);
    if (!row || row.disabledAt) return undefined;
    if (payload.ver !== row.sessionVersion) return undefined;
    return { id: row.id, role: row.role };
  }
}
