import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CatalogStore, Cuisine, HomeScreen, SearchResult, SearchSuggestion, StorePage } from '@tawsela/shared';
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

  @Get('stores')
  stores(@Query() query: CatalogStoresQuery): Promise<CatalogStore[]> {
    return this.catalog.stores(query);
  }

  @Get('search')
  search(@Query() query: SearchQuery): Promise<SearchResult[]> {
    return this.catalog.search(query.q, query.scope);
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
