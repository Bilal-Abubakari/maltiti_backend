import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { SaleStatus } from "../../enum/sale-status.enum";

export class UpdateSaleStatusDto {
  @ApiProperty({ enum: SaleStatus })
  @IsEnum(SaleStatus)
  public status: SaleStatus;
}
