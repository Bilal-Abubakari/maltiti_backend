import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReviewResponseDto {
  @ApiProperty({
    description: "Unique identifier of the review",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  public id: string;

  @ApiProperty({
    description: "ID of the sale",
    example: "123e4567-e89b-12d3-a456-426614174002",
  })
  public saleId: string;

  @ApiProperty({
    description: "Customer name",
    example: "John Doe",
  })
  public customerName: string;

  @ApiProperty({
    description: "Rating given",
    example: 5,
  })
  public rating: number;

  @ApiPropertyOptional({
    description: "Title of the review",
    example: "Excellent product",
  })
  public title?: string;

  @ApiProperty({
    description: "Review comment",
    example: "Highly recommend this product.",
  })
  public comment: string;

  @ApiProperty({
    description: "Date when the review was created",
    example: "2023-10-01T12:00:00Z",
  })
  public createdAt: Date;

  @ApiProperty({
    description: "Date when the review was last updated",
    example: "2023-10-01T12:00:00Z",
  })
  public updatedAt: Date;
}
