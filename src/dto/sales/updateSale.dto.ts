import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SaleStatus } from "../../enum/sale-status.enum";

class BatchAllocationDto {
  @ApiPropertyOptional()
  @IsString()
  public batchId: string;

  @ApiPropertyOptional()
  @IsNumber()
  public quantity: number;
}

class UpdateSaleLineItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  public productId?: string;

  @ApiPropertyOptional({ type: [BatchAllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchAllocationDto)
  public batchAllocations?: BatchAllocationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public requestedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public customPrice?: number;
}

export class UpdateSaleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  public customerId?: string;

  @ApiPropertyOptional({
    enum: SaleStatus,
    default: SaleStatus.INVOICE_REQUESTED,
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  public status?: SaleStatus;

  @ApiPropertyOptional({ type: [UpdateSaleLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSaleLineItemDto)
  public lineItems?: UpdateSaleLineItemDto[];
}
