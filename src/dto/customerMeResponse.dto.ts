import { ApiProperty } from "@nestjs/swagger";
import { CustomerResponseDto } from "./customerResponse.dto";

/**
 * Response DTO for getting the logged-in user's customer information
 */
export class CustomerMeResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "Customer information loaded successfully",
  })
  public message: string;

  @ApiProperty({
    description: "Customer data",
    type: CustomerResponseDto,
  })
  public data: CustomerResponseDto;
}
