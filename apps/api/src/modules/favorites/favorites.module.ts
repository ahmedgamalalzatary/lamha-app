import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesRepository } from './favorites.repository.js';

@Module({
  imports: [CatalogModule],
  controllers: [FavoritesController],
  providers: [FavoritesRepository],
})
export class FavoritesModule {}
