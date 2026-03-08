import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductResponseDto } from "./productResponse.dto";

/**
 * DTO for Batch responses in API documentation
 */
export class BatchResponseDto {
  @ApiProperty({
    description: "Unique identifier for the batch",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  public id: string;

  @ApiProperty({
    description: "Unique batch number",
    example: "BATCH-2024-12-001",
  })
  public batchNumber: string;

  @ApiPropertyOptional({
    description: "Date when the batch was produced",
    example: "2024-12-01",
    type: Date,
  })
  public productionDate?: Date;

  @ApiPropertyOptional({
    description: "Date when the batch expires",
    example: "2026-12-01",
    type: Date,
  })
  public expiryDate?: Date;

  @ApiPropertyOptional({
    description: "Location where the batch was manufactured",
    example: "Tamale Production Facility",
  })
  public manufacturingLocation?: string;

  @ApiPropertyOptional({
    description: "Quality check status of the batch",
    example: "Passed",
  })
  public qualityCheckStatus?: string;

  @ApiPropertyOptional({
    description: "Additional notes about the batch",
    example: "High quality batch from premium raw materials",
  })
  public notes?: string;

  @ApiProperty({
    description: "Quantity of items in the batch",
    example: 500,
  })
  public quantity: number;

  @ApiProperty({
    description: "Whether the batch is active",
    example: true,
  })
  public isActive: boolean;

  @ApiProperty({
    description: "Associated product",
    type: () => ProductResponseDto,
  })
  public product: ProductResponseDto;

  @ApiProperty({
    description: "Batch creation date",
    example: "2024-12-09T00:00:00.000Z",
  })
  public createdAt: Date;

  @ApiProperty({
    description: "Last update date",
    example: "2024-12-09T00:00:00.000Z",
  })
  public updatedAt: Date;

  @ApiPropertyOptional({
    description: "Deletion date (soft delete)",
    example: null,
    type: Date,
  })
  public deletedAt?: Date;
}
