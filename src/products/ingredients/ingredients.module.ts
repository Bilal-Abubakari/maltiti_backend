import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ingredient } from "../../entities/Ingredient.entity";
import { IngredientsService } from "./ingredients.service";
import { IngredientsController } from "./ingredients.controller";

/**
 * Module for ingredients functionality.
 * Handles ingredient-related operations.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Ingredient])],
  controllers: [IngredientsController],
  providers: [IngredientsService],
  exports: [IngredientsService],
})
export class IngredientsModule {}
