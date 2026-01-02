import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for adding a product to the shopping cart
 */
export class AddCartDto {
  @ApiProperty({
    description: "The UUID of the product to add to cart",
    example: "550e8400-e29b-41d4-a716-446655440000",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Product ID is required" })
  @IsUUID("4", { message: "Product ID must be a valid UUID" })
  public id: string;
}

/**
 * DTO for a single cart item with quantity
 */
export class AddBulkCartItemDto {
  @ApiProperty({
    description: "The UUID of the product to add to cart",
    example: "550e8400-e29b-41d4-a716-446655440000",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Product ID is required" })
  @IsUUID("4", { message: "Product ID must be a valid UUID" })
  public productId: string;

  @ApiProperty({
    description:
      "The quantity of the product in the cart (must be a positive integer)",
    example: 3,
    type: Number,
    required: true,
    minimum: 1,
  })
  @IsNotEmpty({ message: "Quantity is required" })
  @IsInt({ message: "Quantity must be an integer" })
  @Min(1, { message: "Quantity must be at least 1" })
  @Type(() => Number)
  public quantity: number;
}

/**
 * DTO for bulk adding multiple products to the shopping cart
 */
export class BulkAddCartDto {
  @ApiProperty({
    description: "Array of cart items to add with their quantities",
    type: [AddBulkCartItemDto],
    required: true,
    example: [
      {
        productId: "550e8400-e29b-41d4-a716-446655440000",
        quantity: 2,
      },
      {
        productId: "660e8400-e29b-41d4-a716-446655440001",
        quantity: 5,
      },
    ],
  })
  @IsArray({ message: "Items must be an array" })
  @ArrayMinSize(1, { message: "At least one item is required" })
  @ValidateNested({ each: true })
  @Type(() => AddBulkCartItemDto)
  public items: AddBulkCartItemDto[];
}

/**
 * DTO for updating the quantity of a cart item
 */
export class AddQuantityDto {
  @ApiProperty({
    description:
      "The quantity of the product in the cart (must be a positive integer)",
    example: 5,
    type: Number,
    required: true,
    minimum: 1,
  })
  @IsNotEmpty({ message: "Quantity is required" })
  @IsInt({ message: "Quantity must be an integer" })
  @Min(1, { message: "Quantity must be at least 1" })
  @Type(() => Number)
  public quantity: number;
}
