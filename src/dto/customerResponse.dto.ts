import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for customer response
 */
export class CustomerResponseDto {
  @ApiProperty({
    description: "The unique identifier of the customer",
    example: "123e4567-e89b-12d3-a456-426614174000",
    type: String,
  })
  public id: string;

  @ApiProperty({
    description: "The name of the customer",
    example: "John Doe",
    type: String,
  })
  public name: string;

  @ApiProperty({
    description: "The phone number of the customer",
    example: "+233123456789",
    type: String,
    required: false,
  })
  public phone?: string;

  @ApiProperty({
    description: "The email address of the customer",
    example: "john.doe@example.com",
    type: String,
    required: false,
  })
  public email?: string;

  @ApiProperty({
    description: "The address of the customer",
    example: "123 Main St, Accra",
    type: String,
    required: false,
  })
  public address?: string;

  @ApiProperty({
    description: "The country of the customer",
    example: "Ghana",
    type: String,
    required: false,
  })
  public country?: string;

  @ApiProperty({
    description: "The region of the customer",
    example: "Greater Accra",
    type: String,
    required: false,
  })
  public region?: string;

  @ApiProperty({
    description: "The city of the customer",
    example: "Accra",
    type: String,
    required: false,
  })
  public city?: string;

  @ApiProperty({
    description: "Additional phone number of the customer",
    example: "+233987654321",
    type: String,
    required: false,
  })
  public phoneNumber?: string;

  @ApiProperty({
    description: "Extra information about the customer",
    example: "Prefers morning deliveries",
    type: String,
    required: false,
  })
  public extraInfo?: string;

  @ApiProperty({
    description: "The date the customer was created",
    example: "2023-01-01T00:00:00.000Z",
    type: Date,
  })
  public createdAt: Date;

  @ApiProperty({
    description: "The date the customer was last updated",
    example: "2023-01-01T00:00:00.000Z",
    type: Date,
  })
  public updatedAt: Date;
}
