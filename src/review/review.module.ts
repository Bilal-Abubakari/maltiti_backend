import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReviewService } from "./review.service";
import { ReviewController } from "./review.controller";
import { Review } from "../entities/Review.entity";
import { Customer } from "../entities/Customer.entity";
import { Sale } from "../entities/Sale.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Review, Customer, Sale])],
  providers: [ReviewService],
  controllers: [ReviewController],
  exports: [ReviewService],
})
export class ReviewModule {}
