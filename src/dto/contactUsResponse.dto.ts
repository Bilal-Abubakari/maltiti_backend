import { ApiProperty } from "@nestjs/swagger";

/**
 * Success response for Contact Us submission
 */
export class ContactUsSuccessResponseDto {
  @ApiProperty({
    description: "Indicates if the operation was successful",
    example: true,
  })
  public success: boolean;

  @ApiProperty({
    description: "Success message",
    example: "Your message has been sent successfully.",
  })
  public message: string;
}

/**
 * Error response for Contact Us submission
 */
export class ContactUsErrorResponseDto {
  @ApiProperty({
    description: "Indicates if the operation was successful",
    example: false,
  })
  public success: boolean;

  @ApiProperty({
    description: "Error message",
    example: "Message is required.",
  })
  public error: string;
}
