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
import { OrderStatus } from "../../enum/order-status.enum";
import { PaymentStatus } from "../../enum/payment-status.enum";

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
    enum: OrderStatus,
    enumName: "OrderStatus",
    default: OrderStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  public orderStatus?: OrderStatus;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    enumName: "PaymentStatus",
    default: PaymentStatus.INVOICE_REQUESTED,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  public paymentStatus?: PaymentStatus;

  @ApiProperty({ type: [SaleLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineItemDto)
  public lineItems: SaleLineItemDto[];
}
