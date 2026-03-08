import { Injectable, NotFoundException } from "@nestjs/common";
import { In, Repository } from "typeorm";
import { Ingredient } from "../../entities/Ingredient.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateIngredientDto } from "../../dto/create-ingredient.dto";
import { UpdateIngredientDto } from "../../dto/update-ingredient.dto";

@Injectable()
export class IngredientsService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientsRepository: Repository<Ingredient>,
  ) {}

  /**
   * Find ingredients by their IDs.
   * @param ids Array of ingredient IDs.
   * @returns Promise of array of ingredients.
   */
  public findByIds(ids: string[]): Promise<Ingredient[]> {
    return this.ingredientsRepository.findBy({ id: In(ids) });
  }

  /**
   * Retrieve all ingredients.
   * @returns Promise of array of all ingredients.
   */
  public async findAll(): Promise<Ingredient[]> {
    return this.ingredientsRepository.find();
  }

  /**
   * Find a single ingredient by ID.
   * @param id The ID of the ingredient.
   * @returns Promise of the ingredient.
   * @throws NotFoundException if ingredient not found.
   */
  public async findOne(id: string): Promise<Ingredient> {
    const ingredient = await this.ingredientsRepository.findOneBy({ id });
    if (!ingredient) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }
    return ingredient;
  }

  /**
   * Create a new ingredient.
   * @param dto The data to create the ingredient.
   * @returns Promise of the created ingredient.
   */
  public async create(dto: CreateIngredientDto): Promise<Ingredient> {
    const ingredient = this.ingredientsRepository.create(dto);
    return this.ingredientsRepository.save(ingredient);
  }

  /**
   * Update an existing ingredient.
   * @param id The ID of the ingredient to update.
   * @param dto The data to update.
   * @returns Promise of the updated ingredient.
   * @throws NotFoundException if ingredient not found.
   */
  public async update(
    id: string,
    dto: UpdateIngredientDto,
  ): Promise<Ingredient> {
    const result = await this.ingredientsRepository.update(id, dto);
    if (result.affected === 0) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }
    return this.findOne(id);
  }

  /**
   * Remove an ingredient by ID.
   * @param id The ID of the ingredient to remove.
   * @throws NotFoundException if ingredient not found.
   */
  public async remove(id: string): Promise<void> {
    const result = await this.ingredientsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }
  }
}
