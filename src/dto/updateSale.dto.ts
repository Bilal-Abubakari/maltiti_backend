import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class BatchAllocationDto {
  @ApiPropertyOptional()
  @IsString()
  public batch_id: string;

  @ApiPropertyOptional()
  @IsNumber()
  public quantity: number;
}

class UpdateSaleLineItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  public product_id?: string;

  @ApiPropertyOptional({ type: [BatchAllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchAllocationDto)
  public batch_allocations?: BatchAllocationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public requested_quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public custom_price?: number;
}

export class UpdateSaleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  public customer_id?: string;

  @ApiPropertyOptional({ type: [UpdateSaleLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSaleLineItemDto)
  public line_items?: UpdateSaleLineItemDto[];
}
