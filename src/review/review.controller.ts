import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ReviewService } from "./review.service";
import { CreateReviewDto } from "../dto/createReview.dto";
import { UpdateReviewDto } from "../dto/updateReview.dto";
import { ReviewResponseDto } from "../dto/reviewResponse.dto";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";

@ApiTags("Reviews")
@Controller("reviews")
@UseGuards(CookieAuthGuard, RolesGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ summary: "Create a new review" })
  @ApiResponse({
    status: 201,
    description: "Review created successfully",
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad Request" })
  @ApiResponse({ status: 404, description: "Customer or Sale not found" })
  public async createReview(
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.createReview(createReviewDto);
  }

  @Get(":id")
  @Roles([Role.User, Role.Admin])
  @ApiOperation({ summary: "Get a review by ID" })
  @ApiParam({
    name: "id",
    description: "Review ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Review retrieved successfully",
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 404, description: "Review not found" })
  public async getReviewById(
    @Param("id") reviewId: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.getReviewById(reviewId);
  }

  @Get("customer/:customerId")
  @Roles([Role.User, Role.Admin])
  @ApiOperation({ summary: "Get reviews by customer ID" })
  @ApiParam({
    name: "customerId",
    description: "Customer ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Reviews retrieved successfully",
    type: [ReviewResponseDto],
  })
  public async getReviewsByCustomer(
    @Param("customerId") customerId: string,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewService.getReviewsByCustomer(customerId);
  }

  @Get("sale/:saleId")
  @Roles([Role.User, Role.Admin])
  @ApiOperation({ summary: "Get reviews by sale ID" })
  @ApiParam({
    name: "saleId",
    description: "Sale ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Reviews retrieved successfully",
    type: [ReviewResponseDto],
  })
  public async getReviewsBySale(
    @Param("saleId") saleId: string,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewService.getReviewsBySale(saleId);
  }

  @Get()
  @Roles([Role.Admin])
  @ApiOperation({ summary: "Get all reviews" })
  @ApiResponse({
    status: 200,
    description: "Reviews retrieved successfully",
    type: [ReviewResponseDto],
  })
  public async getAllReviews(): Promise<ReviewResponseDto[]> {
    return this.reviewService.getAllReviews();
  }

  @Put(":id")
  @Roles([Role.User, Role.Admin])
  @ApiOperation({ summary: "Update a review" })
  @ApiParam({
    name: "id",
    description: "Review ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Review updated successfully",
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 404, description: "Review not found" })
  public async updateReview(
    @Param("id") reviewId: string,
    @Body() updateDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.updateReview(reviewId, updateDto);
  }

  @Delete(":id")
  @Roles([Role.Admin])
  @ApiOperation({ summary: "Delete a review" })
  @ApiParam({
    name: "id",
    description: "Review ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({ status: 200, description: "Review deleted successfully" })
  @ApiResponse({ status: 404, description: "Review not found" })
  public async deleteReview(@Param("id") reviewId: string): Promise<void> {
    return this.reviewService.deleteReview(reviewId);
  }
}
