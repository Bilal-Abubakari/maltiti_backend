import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsUUID,
  IsDateString,
  IsNumber,
  IsPositive,
  IsOptional,
  Min,
  Max,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { GhanaRegion } from "../enum/ghana-region.enum";
import { EducationLevel } from "../enum/education-level.enum";
import { IdType } from "../enum/id-type.enum";

/**
 * DTO for adding a new cooperative member
 */
export class AddCooperativeMemberDto {
  @ApiProperty({
    description: "The full name of the cooperative member",
    example: "Fatima Abdul-Rahman",
    type: String,
    required: true,
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty({ message: "Member name is required" })
  @IsString({ message: "Member name must be a string" })
  @MinLength(3, { message: "Member name must be at least 3 characters long" })
  @MaxLength(100, { message: "Member name must not exceed 100 characters" })
  public name: string;

  @ApiProperty({
    description: "The UUID of the cooperative this member belongs to",
    example: "550e8400-e29b-41d4-a716-446655440000",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Cooperative ID is required" })
  @IsUUID("4", { message: "Cooperative ID must be a valid UUID" })
  public cooperative: string;

  @ApiProperty({
    description:
      "The phone number of the member (must be unique, Ghana format)",
    example: "+233244123456",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Phone number is required" })
  @IsString({ message: "Phone number must be a string" })
  @MinLength(10, { message: "Phone number must be at least 10 characters" })
  @MaxLength(20, { message: "Phone number must not exceed 20 characters" })
  public phoneNumber: string;

  @ApiProperty({
    description: "The house number or residential address identifier",
    example: "House 42B",
    type: String,
    required: true,
    maxLength: 50,
  })
  @IsNotEmpty({ message: "House number is required" })
  @IsString({ message: "House number must be a string" })
  @MaxLength(50, { message: "House number must not exceed 50 characters" })
  public houseNumber: string;

  @ApiProperty({
    description: "The GPS address or digital address",
    example: "GT-0123-4567",
    type: String,
    required: true,
    maxLength: 20,
  })
  @IsNotEmpty({ message: "GPS address is required" })
  @IsString({ message: "GPS address must be a string" })
  @MaxLength(20, { message: "GPS address must not exceed 20 characters" })
  public gpsAddress: string;

  @ApiProperty({
    description:
      "The profile image URL or file reference (uploaded separately)",
    example: "https://s3.amazonaws.com/bucket/member-photos/image.jpg",
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Image must be a string" })
  public image: string;

  @ApiProperty({
    description:
      "The type of identification document (e.g., National ID, Voter ID, Passport)",
    example: IdType.GHANA_CARD,
    type: String,
    required: true,
    enum: IdType,
    enumName: "IdType",
  })
  @IsNotEmpty({ message: "ID type is required" })
  @IsEnum(IdType, { message: "ID type must be a valid identification type" })
  public idType: IdType;

  @ApiProperty({
    description: "The identification number (must be unique)",
    example: "GHA-123456789-0",
    type: String,
    required: true,
    maxLength: 50,
  })
  @IsNotEmpty({ message: "ID number is required" })
  @IsString({ message: "ID number must be a string" })
  @MinLength(5, { message: "ID number must be at least 5 characters long" })
  @MaxLength(50, { message: "ID number must not exceed 50 characters" })
  public idNumber: string;

  @ApiProperty({
    description: "The community or locality where the member resides",
    example: "Savelugu",
    type: String,
    required: true,
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty({ message: "Community is required" })
  @IsString({ message: "Community must be a string" })
  @MinLength(2, { message: "Community must be at least 2 characters long" })
  @MaxLength(100, { message: "Community must not exceed 100 characters" })
  public community: string;

  @ApiProperty({
    description: "The district where the member resides",
    example: "Savelugu Municipal",
    type: String,
    required: true,
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty({ message: "District is required" })
  @IsString({ message: "District must be a string" })
  @MinLength(2, { message: "District must be at least 2 characters long" })
  @MaxLength(100, { message: "District must not exceed 100 characters" })
  public district: string;

  @ApiProperty({
    description: "The region of Ghana where the member resides",
    example: GhanaRegion.NORTHERN,
    type: String,
    required: true,
    enum: GhanaRegion,
    enumName: "GhanaRegion",
  })
  @IsNotEmpty({ message: "Region is required" })
  @IsEnum(GhanaRegion, { message: "Region must be a valid Ghana region" })
  public region: GhanaRegion;

  @ApiProperty({
    description: "The date of birth of the member (ISO 8601 format)",
    example: "1985-06-15",
    type: String,
    required: true,
    format: "date",
  })
  @IsNotEmpty({ message: "Date of birth is required" })
  @IsDateString({}, { message: "Date of birth must be a valid date" })
  public dob: Date;

  @ApiProperty({
    description: "The highest level of education attained",
    example: EducationLevel.JUNIOR_HIGH_SCHOOL,
    type: String,
    required: true,
    enum: EducationLevel,
    enumName: "EducationLevel",
  })
  @IsNotEmpty({ message: "Education level is required" })
  @IsEnum(EducationLevel, {
    message: "Education level must be a valid education level",
  })
  public education: EducationLevel;

  @ApiProperty({
    description: "The primary occupation of the member",
    example: "Shea Butter Producer",
    type: String,
    required: true,
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty({ message: "Occupation is required" })
  @IsString({ message: "Occupation must be a string" })
  @MinLength(2, { message: "Occupation must be at least 2 characters long" })
  @MaxLength(100, { message: "Occupation must not exceed 100 characters" })
  public occupation: string;

  @ApiProperty({
    description: "The secondary occupation of the member (if any)",
    example: "Farmer",
    type: String,
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: "Secondary occupation must be a string" })
  @MaxLength(100, {
    message: "Secondary occupation must not exceed 100 characters",
  })
  public secondaryOccupation: string;

  @ApiProperty({
    description:
      "The types of crops cultivated by the member (comma-separated)",
    example: "Shea nuts, Groundnuts, Maize",
    type: String,
    required: true,
    maxLength: 200,
  })
  @IsNotEmpty({ message: "Crops information is required" })
  @IsString({ message: "Crops must be a string" })
  @MaxLength(200, { message: "Crops must not exceed 200 characters" })
  public crops: string;

  @ApiProperty({
    description: "The size of the farm in acres",
    example: 5.5,
    type: Number,
    required: true,
    minimum: 0,
    maximum: 10000,
  })
  @IsNotEmpty({ message: "Farm size is required" })
  @IsNumber({}, { message: "Farm size must be a number" })
  @IsPositive({ message: "Farm size must be a positive number" })
  @Min(0.1, { message: "Farm size must be at least 0.1 acres" })
  @Max(10000, { message: "Farm size must not exceed 10000 acres" })
  @Type(() => Number)
  public farmSize: number;
}
