import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
    minLength: 1,
    maxLength: 200,
  })
  @IsNotEmpty({ message: "Customer name is required" })
  @IsString({ message: "Customer name must be a string" })
  @MinLength(1, { message: "Customer name must be at least 1 character long" })
  @MaxLength(200, { message: "Customer name must not exceed 200 characters" })
  public name: string;

  @ApiPropertyOptional({
    description: "The phone number of the customer",
    example: "+233123456789",
  })
  @IsOptional()
  @IsString({ message: "Phone must be a string" })
  public phone?: string;

  @ApiPropertyOptional({
    description: "Alternative phone number of the customer",
    example: "+233987654321",
  })
  @IsOptional()
  @IsString({ message: "Phone number must be a string" })
  public phoneNumber?: string;

  @ApiPropertyOptional({
    description: "The email address of the customer",
    example: "john.doe@example.com",
  })
  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  public email?: string;

  @ApiPropertyOptional({
    description: "The full address of the customer",
    example: "123 Main St, Accra",
  })
  @IsOptional()
  @IsString({ message: "Address must be a string" })
  public address?: string;

  @ApiPropertyOptional({
    description: "The country the customer is from",
    example: "Ghana",
  })
  @IsOptional()
  @IsString({ message: "Country must be a string" })
  public country?: string;

  @ApiPropertyOptional({
    description: "The region or state the customer is from",
    example: "Northern Region",
  })
  @IsOptional()
  @IsString({ message: "Region must be a string" })
  public region?: string;

  @ApiPropertyOptional({
    description: "The city the customer is from",
    example: "Tamale",
  })
  @IsOptional()
  @IsString({ message: "City must be a string" })
  public city?: string;

  @ApiPropertyOptional({
    description: "Additional information about the customer",
    example: "Prefers delivery on weekdays",
  })
  @IsOptional()
  @IsString({ message: "Extra info must be a string" })
  public extraInfo?: string;
}
