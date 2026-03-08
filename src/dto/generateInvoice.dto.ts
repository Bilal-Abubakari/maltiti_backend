import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";

export class GenerateInvoiceDto {
  @ApiPropertyOptional({ description: "Discount amount", default: 0 })
  @IsOptional()
  @IsNumber()
  public discount?: number;

  @ApiPropertyOptional({ description: "Transportation cost", default: 0 })
  @IsOptional()
  @IsNumber()
  public transportation?: number;
}
