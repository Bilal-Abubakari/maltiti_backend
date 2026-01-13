import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsInt,
  Min,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for guest cart operations that require session ID
 */
export class GuestSessionDto {
  @ApiProperty({
    description: "Session ID for guest user",
    example: "guest-session-123",
    required: true,
  })
  @IsNotEmpty({ message: "Session ID is required" })
  @IsString({ message: "Session ID must be a string" })
  public sessionId: string;
}

/**
 * DTO for adding a product to guest cart
 */
export class AddToGuestCartDto {
  @ApiProperty({
    description: "Session ID for guest user",
    example: "guest-session-123",
    required: true,
  })
  @IsNotEmpty({ message: "Session ID is required" })
  @IsString({ message: "Session ID must be a string" })
  public sessionId: string;

  @ApiProperty({
    description: "The UUID of the product to add to cart",
    example: "550e8400-e29b-41d4-a716-446655440000",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Product ID is required" })
  @IsUUID("4", { message: "Product ID must be a valid UUID" })
  public id: string;

  @ApiProperty({
    description:
      "The quantity of the product in the cart (must be a positive integer)",
    example: 5,
    type: Number,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: "Quantity must be an integer" })
  @Min(1, { message: "Quantity must be at least 1" })
  @Type(() => Number)
  public quantity?: number;
}

/**
 * DTO for updating quantity in guest cart
 */
export class UpdateGuestCartQuantityDto {
  @ApiProperty({
    description: "Session ID for guest user",
    example: "guest-session-123",
    required: true,
  })
  @IsNotEmpty({ message: "Session ID is required" })
  @IsString({ message: "Session ID must be a string" })
  public sessionId: string;

  @ApiProperty({
    description: "The new quantity for the cart item",
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
