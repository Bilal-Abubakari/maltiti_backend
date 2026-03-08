import { ApiProperty } from "@nestjs/swagger";
import { SaleResponseDto } from "./saleResponse.dto";

/**
 * Response DTO for tracking an order
 */
export class TrackOrderResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "Order tracked successfully",
  })
  public message: string;

  @ApiProperty({
    description: "Sale/Order data",
    type: () => SaleResponseDto,
  })
  public data: SaleResponseDto;
}
