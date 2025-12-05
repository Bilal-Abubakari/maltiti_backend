import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CancelSaleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public reason?: string;
}
