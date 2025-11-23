import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { CreateProductDto } from "./createProduct.dto";

/**
 * DTO for creating a new batch
 */
export class CreateBatchDto {
  @ApiProperty({
    description: "Unique batch number",
    example: "BATCH-2024-001",
  })
  @IsNotEmpty()
  @IsString()
  public batchNumber: string;

  @ApiPropertyOptional({
    description: "Production/manufacturing date",
    example: "2024-01-15",
  })
  @IsOptional()
  @IsDateString()
  public productionDate?: string;

  @ApiPropertyOptional({
    description: "Expiry date",
    example: "2026-01-15",
  })
  @IsOptional()
  @IsDateString()
  public expiryDate?: string;

  @ApiPropertyOptional({
    description: "Manufacturing location",
    example: "Tamale Production Facility",
  })
  @IsOptional()
  @IsString()
  public manufacturingLocation?: string;

  @ApiPropertyOptional({
    description: "Quality check status",
    example: "Passed",
  })
  @IsOptional()
  @IsString()
  public qualityCheckStatus?: string;

  @ApiPropertyOptional({
    description: "Additional notes about the batch",
    example: "Premium quality shea nuts sourced from Yendi",
  })
  @IsOptional()
  @IsString()
  public notes?: string;
}

/**
 * DTO for updating an existing product
 * All fields are optional (partial)
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: "Whether to mark this update as a minor change",
    example: false,
  })
  public isMinorUpdate?: boolean;
}
