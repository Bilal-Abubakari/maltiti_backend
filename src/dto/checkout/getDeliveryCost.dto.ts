import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for requesting delivery cost based on location.
 */
export class GetDeliveryCostDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: "The country for delivery." })
  public country: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: "The city for delivery." })
  public city: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: "The region for delivery." })
  public region: string;
}
