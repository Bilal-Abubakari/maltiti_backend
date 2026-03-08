import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Review } from "../entities/Review.entity";
import { Sale } from "../entities/Sale.entity";
import { CreateReviewDto } from "../dto/createReview.dto";
import { UpdateReviewDto } from "../dto/updateReview.dto";
import { ReviewResponseDto } from "../dto/reviewResponse.dto";
import { NotificationIntegrationService } from "../notification/notification-integration.service";
import { NotificationService } from "../notification/notification.service";
import { Product } from "../entities/Product.entity";

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly notificationIntegrationService: NotificationIntegrationService,
    private readonly notificationService: NotificationService,
  ) {}

  public async createReview(
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const { saleId, rating, title, comment } = createReviewDto;

    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: null },
      relations: ["customer", "customer.user"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    const review = this.reviewRepository.create({
      sale,
      saleId,
      rating,
      title,
      comment,
    });

    const savedReview = await this.reviewRepository.save(review);

    // Send admin notification
    try {
      const adminUserIds = await this.notificationService.getAdminUserIds();
      const firstItem = sale.lineItems?.[0];
      let productName = "Product";
      let productId = "N/A";

      if (firstItem) {
        productId = firstItem.productId;
        const product = await this.productRepository.findOne({
          where: { id: productId },
        });
        if (product) {
          productName = product.name;
        }
      }

      await this.notificationIntegrationService.notifyReviewSubmitted(
        sale.customer.user?.id || "",
        savedReview.id,
        productId,
        productName,
        sale.customer.name,
        rating,
        adminUserIds,
      );
    } catch (error) {
      // Don't fail the review creation if notification fails
      this.logger.error(
        `Failed to send purchase review in-app notification: ${error.message}`,
      );
    }

    return this.transformToResponseDto(savedReview);
  }

  public async getReviewById(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ["sale.customer"],
    });
    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found`);
    }
    return this.transformToResponseDto(review);
  }

  public async getReviewsByCustomer(
    customerId: string,
  ): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewRepository.find({
      relations: ["sale.customer"],
      where: { sale: { customer: { id: customerId } } },
      order: { createdAt: "DESC" },
    });
    return reviews.map(review => this.transformToResponseDto(review));
  }

  public async getReviewsBySale(saleId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewRepository.find({
      where: { saleId },
      relations: ["sale.customer"],
      order: { createdAt: "DESC" },
    });
    return reviews.map(review => this.transformToResponseDto(review));
  }

  public async getAllReviews(): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewRepository.find({
      relations: ["sale.customer"],
      order: { createdAt: "DESC" },
    });
    return reviews.map(review => this.transformToResponseDto(review));
  }

  public async updateReview(
    reviewId: string,
    updateDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ["sale.customer"],
    });
    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found`);
    }

    if (updateDto.rating !== undefined) {
      review.rating = updateDto.rating;
    }
    if (updateDto.title !== undefined) {
      review.title = updateDto.title;
    }
    if (updateDto.comment !== undefined) {
      review.comment = updateDto.comment;
    }

    const savedReview = await this.reviewRepository.save(review);
    return this.transformToResponseDto(savedReview);
  }

  public async deleteReview(reviewId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found`);
    }
    await this.reviewRepository.remove(review);
  }

  private transformToResponseDto(review: Review): ReviewResponseDto {
    return {
      id: review.id,
      saleId: review.saleId,
      customerName: review.sale.customer.name,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
