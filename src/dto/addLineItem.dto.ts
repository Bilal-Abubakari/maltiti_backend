import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class BatchAllocationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public batchId: string;

  @ApiProperty()
  @IsNumber()
  public quantity: number;
}

export class AddLineItemDto {
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
