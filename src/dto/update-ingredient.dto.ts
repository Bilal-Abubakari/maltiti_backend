import { IsString } from "class-validator";

/**
 * DTO for updating an existing ingredient.
 */
export class UpdateIngredientDto {
  /**
   * The name of the ingredient. Must be unique if provided.
   */
  @IsString()
  public name?: string;
}
