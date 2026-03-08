import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateReviewDto {
  @ApiPropertyOptional({
    description: "Rating from 1 to 5",
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  public rating?: number;

  @ApiPropertyOptional({
    description: "Title of the review",
    example: "Good service",
  })
  @IsOptional()
  @IsString()
  public title?: string;

  @ApiPropertyOptional({
    description: "Comment or feedback text",
    example: "The product was good but delivery was a bit late.",
  })
  @IsOptional()
  @IsString()
  public comment?: string;
}
