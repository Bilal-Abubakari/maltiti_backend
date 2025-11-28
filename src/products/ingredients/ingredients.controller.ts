import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { IngredientsService } from "./ingredients.service";
import { CreateIngredientDto } from "../../dto/create-ingredient.dto";
import { UpdateIngredientDto } from "../../dto/update-ingredient.dto";
import { Ingredient } from "../../entities/Ingredient.entity";

/**
 * Controller for managing ingredients.
 * Provides CRUD operations for ingredients.
 */
@ApiTags("ingredients")
@Controller("ingredients")
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  /**
   * Retrieve all ingredients.
   * @returns Array of all ingredients.
   */
  @ApiOperation({ summary: "Retrieve all ingredients" })
  @ApiResponse({ status: 200, description: "List of all ingredients" })
  @Get()
  public async findAll(): Promise<Ingredient[]> {
    return this.ingredientsService.findAll();
  }

  /**
   * Retrieve a single ingredient by ID.
   * @param id The ID of the ingredient.
   * @returns The ingredient object.
   */
  @ApiOperation({ summary: "Retrieve a single ingredient by ID" })
  @ApiParam({ name: "id", description: "The ID of the ingredient" })
  @ApiResponse({ status: 200, description: "The ingredient object" })
  @ApiResponse({ status: 404, description: "Ingredient not found" })
  @Get(":id")
  public async findOne(@Param("id") id: string): Promise<Ingredient> {
    return this.ingredientsService.findOne(id);
  }

  /**
   * Create a new ingredient.
   * @param dto The data for the new ingredient.
   * @returns The created ingredient.
   */
  @ApiOperation({ summary: "Create a new ingredient" })
  @ApiBody({ type: CreateIngredientDto })
  @ApiResponse({ status: 201, description: "The created ingredient" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @Post()
  public async create(@Body() dto: CreateIngredientDto): Promise<Ingredient> {
    return this.ingredientsService.create(dto);
  }

  /**
   * Update an existing ingredient.
   * @param id The ID of the ingredient to update.
   * @param dto The data to update.
   * @returns The updated ingredient.
   */
  @ApiOperation({ summary: "Update an existing ingredient" })
  @ApiParam({
    name: "id",
    description: "The ID of the ingredient to update",
  })
  @ApiBody({ type: UpdateIngredientDto })
  @ApiResponse({ status: 200, description: "The updated ingredient" })
  @ApiResponse({ status: 404, description: "Ingredient not found" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @Put(":id")
  public async update(
    @Param("id") id: string,
    @Body() dto: UpdateIngredientDto,
  ): Promise<Ingredient> {
    return this.ingredientsService.update(id, dto);
  }

  /**
   * Delete an ingredient by ID.
   * @param id The ID of the ingredient to delete.
   */
  @ApiOperation({ summary: "Delete an ingredient by ID" })
  @ApiParam({ name: "id", description: "The ID of the ingredient to delete" })
  @ApiResponse({
    status: 200,
    description: "Ingredient deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Ingredient not found" })
  @Delete(":id")
  public async remove(@Param("id") id: string): Promise<void> {
    return this.ingredientsService.remove(id);
  }
}
