import { IsString } from "class-validator";

/**
 * DTO for creating a new ingredient.
 */
export class CreateIngredientDto {
  /**
   * The name of the ingredient. Must be unique.
   */
  @IsString()
  public name: string;
}
