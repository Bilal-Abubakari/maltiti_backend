import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class GenerateReceiptDto {
  @ApiPropertyOptional({ description: "Payment method", default: "Cash" })
  @IsOptional()
  @IsString()
  public paymentMethod?: string;

  @ApiPropertyOptional({ description: "Discount amount", default: 0 })
  @IsOptional()
  @IsNumber()
  public discount?: number;

  @ApiPropertyOptional({ description: "Transportation cost", default: 0 })
  @IsOptional()
  @IsNumber()
  public transportation?: number;
}
