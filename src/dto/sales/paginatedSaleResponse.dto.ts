import { ApiProperty } from "@nestjs/swagger";
import { SaleResponseDto } from "./saleResponse.dto";

export class SalePaginationDto {
  @ApiProperty({
    description: "Total number of items",
    example: 100,
  })
  public totalItems: number;

  @ApiProperty({
    description: "Current page number",
    example: 1,
  })
  public currentPage: number;

  @ApiProperty({
    description: "Total number of pages",
    example: 10,
  })
  public totalPages: number;

  @ApiProperty({
    description: "Array of sale items",
    type: () => [SaleResponseDto],
  })
  public items: SaleResponseDto[];
}

export class PaginatedSaleResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "Sales loaded successfully",
  })
  public message: string;

  @ApiProperty({
    description: "Paginated data",
    type: () => SalePaginationDto,
  })
  public data: SalePaginationDto;
}
