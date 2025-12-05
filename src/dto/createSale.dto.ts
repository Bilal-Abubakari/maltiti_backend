import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SaleStatus } from "../enum/sale-status.enum";

class BatchAllocationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public batch_id: string;

  @ApiProperty()
  @IsNumber()
  public quantity: number;
}

class SaleLineItemDto {
  @ApiProperty()
  @IsUUID()
  public product_id: string;

  @ApiProperty({ type: [BatchAllocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchAllocationDto)
  public batch_allocations: BatchAllocationDto[];

  @ApiProperty()
  @IsNumber()
  public requested_quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public custom_price?: number;
}

export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  public customer_id: string;

  @ApiPropertyOptional({
    enum: SaleStatus,
    default: SaleStatus.INVOICE_REQUESTED,
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  public status?: SaleStatus;

  @ApiProperty({ type: [SaleLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineItemDto)
  public line_items: SaleLineItemDto[];
}
