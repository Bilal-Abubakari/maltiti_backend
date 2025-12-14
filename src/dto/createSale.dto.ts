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
  public batchId: string;

  @ApiProperty()
  @IsNumber()
  public quantity: number;
}

class SaleLineItemDto {
  @ApiProperty()
  @IsUUID()
  public productId: string;

  @ApiProperty({ type: [BatchAllocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchAllocationDto)
  public batchAllocations: BatchAllocationDto[];

  @ApiProperty()
  @IsNumber()
  public requestedQuantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public customPrice?: number;
}

export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  public customerId: string;

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
  public lineItems: SaleLineItemDto[];
}
