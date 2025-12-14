import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
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

export class AssignBatchesDto {
  @ApiProperty()
  @IsUUID()
  public productId: string;

  @ApiProperty({ type: [BatchAllocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchAllocationDto)
  public batchAllocations: BatchAllocationDto[];
}
