import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateProductDto } from "./createProduct.dto";

/**
 * DTO for updating an existing product
 * All fields are optional (partial)
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: "Whether to mark this update as a minor change",
    example: false,
  })
  public isMinorUpdate?: boolean;
}
