import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUUID } from "class-validator";

/**
 * DTO for querying batches by multiple product IDs
 */
export class GetBatchesByProductsDto {
  @ApiProperty({
    description: "Array of product IDs to retrieve batches for",
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "456e7890-e89b-12d3-a456-426614174001",
    ],
    type: [String],
  })
  @IsArray()
  @IsUUID("4", { each: true })
  public productIds: string[];
}
