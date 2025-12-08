import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
} from "class-validator";

/**
 * DTO for creating a new customer
 */
export class CreateCustomerDto {
  @ApiProperty({
    description: "The name of the customer",
    example: "John Doe",
    type: String,
    required: true,
    minLength: 1,
    maxLength: 200,
  })
  @IsNotEmpty({ message: "Customer name is required" })
  @IsString({ message: "Customer name must be a string" })
  @MinLength(1, {
    message: "Customer name must be at least 1 character long",
  })
  @MaxLength(200, {
    message: "Customer name must not exceed 200 characters",
  })
  public name: string;

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
