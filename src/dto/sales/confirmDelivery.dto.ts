import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class ConfirmDeliveryDto {
  @ApiProperty({
    description: "Confirmation status for delivery",
    example: true,
  })
  @IsBoolean()
  public confirmed: boolean;
}
