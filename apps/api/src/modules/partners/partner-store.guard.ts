import {
  applyDecorators,
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { ApiException } from '../../common/api-exception.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { StoreRow } from '../catalog/catalog.schema.js';
import { CatalogRepository } from '../catalog/catalog.repository.js';
import { UsersRepository } from '../users/users.repository.js';

type PartnerRequest = { user?: AuthUser; store?: StoreRow };

/**
 * The partner store guard (contract §2, §11.1): the store always comes from the signed-in
 * partner's own account, never from the request, so a partner never reaches another store's data.
 */
@Injectable()
export class PartnerStoreGuard implements CanActivate {
  constructor(
    private readonly users: UsersRepository,
    private readonly catalog: CatalogRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<PartnerRequest>();
    const account = req.user && (await this.users.findLiveById(req.user.id));
    const store = account?.storeId ? await this.catalog.findStore(account.storeId) : undefined;
    if (!store) throw new ApiException(HttpStatus.FORBIDDEN, 'NO_STORE', 'This partner account has no store');
    req.store = store;
    return true;
  }
}

/** Put on every `/v1/partner/*` controller: partners only, with their store loaded. */
export const PartnerArea = () => applyDecorators(Roles('partner'), UseGuards(PartnerStoreGuard));

/** The signed-in partner's store, loaded by PartnerStoreGuard. */
export const CurrentStore = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): StoreRow => ctx.switchToHttp().getRequest<{ store: StoreRow }>().store,
);
