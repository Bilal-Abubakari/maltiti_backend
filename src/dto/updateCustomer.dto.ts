import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  MinLength,
  MaxLength,
} from "class-validator";

/**
 * DTO for updating an existing customer
 */
export class UpdateCustomerDto {
  @ApiProperty({
    description: "The ID of the customer to update",
    example: "123e4567-e89b-12d3-a456-426614174000",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Customer ID is required" })
  @IsUUID("4", { message: "Invalid customer ID format" })
  public id: string;

  @ApiProperty({
    description: "The name of the customer",
    example: "John Doe",
    type: String,
    required: false,
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: "Customer name must be a string" })
  @MinLength(1, {
    message: "Customer name must be at least 1 character long",
  })
  @MaxLength(200, {
    message: "Customer name must not exceed 200 characters",
  })
  public name?: string;

  @ApiProperty({
    description: "The phone number of the customer",
    example: "+233123456789",
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Phone must be a string" })
  public phone?: string;

  @ApiProperty({
    description: "The email address of the customer",
    example: "john.doe@example.com",
    type: String,
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  public email?: string;

  @ApiProperty({
    description: "The address of the customer",
    example: "123 Main St, Accra",
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Address must be a string" })
  public address?: string;
}
