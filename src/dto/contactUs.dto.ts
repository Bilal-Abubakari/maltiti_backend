import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
/**
 * DTO for Contact Us submission
 */
export class ContactUsDto {
  @ApiPropertyOptional({
    description: "Full name of the person contacting",
    example: "John Doe",
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Full name must be a string" })
  @Transform(({ value }) => value?.trim())
  public fullName?: string;
  @ApiPropertyOptional({
    description: "Email address of the person contacting",
    example: "john.doe@example.com",
    type: String,
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: "Please provide a valid email address" })
  @Transform(({ value }) => value?.trim())
  public email?: string;
  @ApiPropertyOptional({
    description:
      "Phone number of the person contacting (accepts international formats)",
    example: "+233244123456",
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Phone number must be a string" })
  @Transform(({ value }) => value?.trim())
  public phoneNumber?: string;
  @ApiProperty({
    description: "Message content (minimum 10 characters)",
    example:
      "I would like to inquire about your shea butter products and pricing.",
    type: String,
    required: true,
    minLength: 10,
  })
  @IsNotEmpty({ message: "Message is required" })
  @IsString({ message: "Message must be a string" })
  @MinLength(10, { message: "Message must be at least 10 characters long" })
  @Transform(({ value }) => value?.trim())
  public message: string;
  // Honeypot field for spam protection (not in API docs)
  @IsOptional()
  @IsString()
  public website?: string;
}
