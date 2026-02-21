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
import { OrderStatus } from "../../enum/order-status.enum";
import { PaymentStatus } from "../../enum/payment-status.enum";

class BatchAllocationDto {
  @ApiPropertyOptional()
  @IsString()
  public batchId: string;

  @ApiPropertyOptional()
  @IsNumber()
  public quantity: number;
}

export class UpdateSaleLineItemDto {
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
    enum: OrderStatus,
    enumName: "OrderStatus",
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  public orderStatus?: OrderStatus;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    enumName: "PaymentStatus",
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  public paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public deliveryFee?: number;

  @ApiPropertyOptional({ type: [UpdateSaleLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSaleLineItemDto)
  public lineItems?: UpdateSaleLineItemDto[];
}
