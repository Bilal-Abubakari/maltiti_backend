import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { SaleStatus } from "../enum/sale-status.enum";

export class ListSalesDto {
  @ApiPropertyOptional({ enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  public status?: SaleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public customerId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  public page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  public limit?: number = 10;
}
