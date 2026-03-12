import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsDateString,
} from "class-validator";
import { SortOrder } from "../enum/sort-order.enum";

export enum CustomerSortBy {
  NAME = "name",
  CREATED_AT = "createdAt",
  EMAIL = "email",
  CITY = "city",
}

export class CustomerQueryDto {
  @ApiPropertyOptional({
    description: "Page number for pagination",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items per page",
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public limit?: number = 20;

  @ApiPropertyOptional({
    description: "Search term to match against name, email, or phone",
    example: "John",
  })
  @IsOptional()
  @IsString()
  public search?: string;

  @ApiPropertyOptional({
    description: "Filter by exact email address",
    example: "customer@example.com",
  })
  @IsOptional()
  @IsString()
  public email?: string;

  @ApiPropertyOptional({
    description: "Filter by exact phone number",
    example: "+233123456789",
  })
  @IsOptional()
  @IsString()
  public phone?: string;

  @ApiPropertyOptional({
    description: "Filter by country (partial match)",
    example: "Ghana",
  })
  @IsOptional()
  @IsString()
  public country?: string;

  @ApiPropertyOptional({
    description: "Filter by region or state (partial match)",
    example: "Northern",
  })
  @IsOptional()
  @IsString()
  public region?: string;

  @ApiPropertyOptional({
    description: "Filter by city (partial match)",
    example: "Tamale",
  })
  @IsOptional()
  @IsString()
  public city?: string;

  @ApiPropertyOptional({
    description: "Filter customers created on or after this date (ISO format)",
    example: "2023-01-01",
  })
  @IsOptional()
  @IsDateString()
  public startDate?: string;

  @ApiPropertyOptional({
    description: "Filter customers created on or before this date (ISO format)",
    example: "2023-12-31",
  })
  @IsOptional()
  @IsDateString()
  public endDate?: string;

  @ApiPropertyOptional({
    description: "Field to sort by",
    enum: CustomerSortBy,
    default: CustomerSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(CustomerSortBy)
  public sortBy?: CustomerSortBy = CustomerSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: "Sort order",
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  public sortOrder?: SortOrder = SortOrder.DESC;
}
