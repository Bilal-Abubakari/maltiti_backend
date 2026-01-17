import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class TrackOrderDto {
  @ApiProperty({
    description: "Email address associated with the order",
    example: "customer@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  public email: string;
}
