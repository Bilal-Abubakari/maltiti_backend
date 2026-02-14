import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateReviewDto {
  @ApiProperty({
    description: "ID of the sale being reviewed",
    example: "123e4567-e89b-12d3-a456-426614174001",
  })
  @IsNotEmpty()
  @IsString()
  public saleId: string;

  @ApiProperty({
    description: "Rating from 1 to 5",
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  public rating: number;

  @ApiPropertyOptional({
    description: "Title of the review",
    example: "Great service!",
  })
  @IsOptional()
  @IsString()
  public title?: string;

  @ApiProperty({
    description: "Comment or feedback text",
    example: "The product was delivered on time and was of excellent quality.",
  })
  @IsNotEmpty()
  @IsString()
  public comment: string;
}
