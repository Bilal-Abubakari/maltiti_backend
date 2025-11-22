import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsNumberString,
} from "class-validator";

/**
 * DTO for creating a new cooperative
 */
export class AddCooperativeDto {
  @ApiProperty({
    description: "The name of the cooperative",
    example: "Shea Women's Cooperative Union",
    type: String,
    required: true,
    minLength: 3,
    maxLength: 200,
  })
  @IsNotEmpty({ message: "Cooperative name is required" })
  @IsString({ message: "Cooperative name must be a string" })
  @MinLength(3, {
    message: "Cooperative name must be at least 3 characters long",
  })
  @MaxLength(200, {
    message: "Cooperative name must not exceed 200 characters",
  })
  public name: string;

  @ApiProperty({
    description: "The community or location where the cooperative operates",
    example: "Tamale, Northern Region",
    type: String,
    required: true,
    minLength: 2,
    maxLength: 150,
  })
  @IsNotEmpty({ message: "Community is required" })
  @IsString({ message: "Community must be a string" })
  @MinLength(2, { message: "Community must be at least 2 characters long" })
  @MaxLength(150, { message: "Community must not exceed 150 characters" })
  public community: string;

  @ApiProperty({
    description:
      "The registration fee for joining the cooperative (in local currency)",
    example: "50.00",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Registration fee is required" })
  @IsNumberString(
    { no_symbols: false },
    { message: "Registration fee must be a valid number" },
  )
  public registrationFee: string;

  @ApiProperty({
    description:
      "The monthly membership fee for the cooperative (in local currency)",
    example: "10.00",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Monthly fee is required" })
  @IsNumberString(
    { no_symbols: false },
    { message: "Monthly fee must be a valid number" },
  )
  public monthlyFee: string;

  @ApiProperty({
    description:
      "The minimum share amount required for membership (in local currency)",
    example: "100.00",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Minimal share is required" })
  @IsNumberString(
    { no_symbols: false },
    { message: "Minimal share must be a valid number" },
  )
  public minimalShare: string;
}
