import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ProductCategory } from "../enum/product-category.enum";
import { ProductStatus } from "../enum/product-status.enum";
import { PackagingSize } from "../enum/packaging-size.enum";

/**
 * DTO for adding a new product
 * @deprecated Use CreateProductDto instead for more comprehensive product creation
 */
export class AddProductDto {
  @ApiProperty({
    description: "The name of the product",
    example: "White Shea Butter Grade A",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Product name is required" })
  @IsString({ message: "Product name must be a string" })
  public name: string;

  @ApiProperty({
    description: "List of product ingredients",
    example: ["100% Pure Shea Butter", "No additives"],
    type: [String],
    required: true,
  })
  @IsNotEmpty({ message: "Ingredients are required" })
  @IsArray({ message: "Ingredients must be an array" })
  @ArrayMinSize(1, { message: "At least one ingredient is required" })
  @IsString({ each: true, message: "Each ingredient must be a string" })
  public ingredients: string[];

  @ApiProperty({
    description: "Product weight or size description",
    example: "1kg",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Weight is required" })
  @IsString({ message: "Weight must be a string" })
  public weight: string;

  @ApiProperty({
    description: "Product category",
    example: ProductCategory.SHEA_BUTTER,
    enum: ProductCategory,
    required: true,
  })
  @IsNotEmpty({ message: "Category is required" })
  @IsEnum(ProductCategory, {
    message: "Category must be a valid product category",
  })
  public category: ProductCategory;

  @ApiProperty({
    description: "Detailed description of the product",
    example:
      "Premium white shea butter extracted from organic shea nuts in Northern Ghana.",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Description is required" })
  @IsString({ message: "Description must be a string" })
  public description: string;

  @ApiPropertyOptional({
    description:
      "Product status (active, inactive, out of stock, discontinued)",
    example: ProductStatus.ACTIVE,
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus, { message: "Status must be a valid product status" })
  public status: ProductStatus;

  @ApiPropertyOptional({
    description: "Packaging size",
    example: PackagingSize.SIZE_1KG,
    enum: PackagingSize,
  })
  @IsOptional()
  @IsEnum(PackagingSize, { message: "Size must be a valid packaging size" })
  public size: PackagingSize;

  @ApiProperty({
    description: "Primary product image URL",
    example: "https://s3.amazonaws.com/bucket/products/shea-butter.jpg",
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: "Image URL is required" })
  @IsString({ message: "Image must be a string" })
  public image: string;

  @ApiProperty({
    description: "Wholesale price per unit",
    example: 15.0,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  public wholesale: number;

  @ApiProperty({
    description: "Retail price per unit",
    example: 20.0,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  public retail: number;

  @ApiPropertyOptional({
    description: "Price for a full box",
    example: 180.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  public inBoxPrice?: number;

  @ApiProperty({
    description: "Number of items in one box/carton",
    example: 12,
    type: Number,
    required: true,
    minimum: 1,
  })
  @IsNotEmpty({ message: "Quantity in box is required" })
  @Type(() => Number)
  @IsNumber({}, { message: "Quantity in box must be a number" })
  @Min(1, { message: "Quantity in box must be at least 1" })
  public quantityInBox: number;

  @ApiPropertyOptional({
    description: "Whether the product is marked as favorite/featured",
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: "Favorite must be a boolean value" })
  public favorite: boolean = false;
}
