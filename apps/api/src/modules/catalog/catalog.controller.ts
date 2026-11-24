import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CatalogStore, Cuisine, HomeScreen, SearchResult, SearchSuggestion, StorePage } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CatalogService } from './catalog.service.js';
import { CatalogStoresQuery, SearchQuery } from './dto/catalog.dto.js';

/** Router for `/v1/catalog`: what the apps read. Any signed-in account (the app opens on sign-in, §8.1). */
@ApiTags('catalog')
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('home')
  home(): Promise<HomeScreen> {
    return this.catalog.home();
  }

  @Get('cuisines')
  cuisines(): Promise<Cuisine[]> {
    return this.catalog.cuisines();
  }

  /** With `addressId`, only the stores of that address's zone (404 when it is not the customer's). */
  @Get('stores')
  stores(@CurrentUser() me: AuthUser, @Query() query: CatalogStoresQuery): Promise<CatalogStore[]> {
    return this.catalog.stores(me.id, query);
  }

  @Get('search')
  search(@CurrentUser() me: AuthUser, @Query() query: SearchQuery): Promise<SearchResult[]> {
    return this.catalog.search(me.id, query.q, query.scope, query.addressId);
  }

  @Get('search/suggestions')
  suggestions(@Query() query: SearchQuery): Promise<SearchSuggestion[]> {
    return this.catalog.suggestions(query.q, query.scope);
  }

  @Get('stores/:id')
  store(@Param('id', ParseIntPipe) id: number): Promise<StorePage> {
    return this.catalog.store(id);
  }
}
