import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cart } from "../entities/Cart.entity";
import { GetDeliveryCostDto } from "../dto/checkout/getDeliveryCost.dto";
import { GuestGetDeliveryCostDto } from "../dto/checkout.dto";
@Injectable()
export class DeliveryCostService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
  ) {}
  public async getDeliveryCost(
    userId: string,
    dto: GetDeliveryCostDto,
  ): Promise<number> {
    const cart = await this.cartRepository.findBy({ user: { id: userId } });
    return this.calculateDeliveryCost(cart, dto.country, dto.city, dto.region);
  }

  public async getGuestDeliveryCost(
    dto: GuestGetDeliveryCostDto,
  ): Promise<number> {
    const cart = await this.cartRepository.findBy({ sessionId: dto.sessionId });
    return this.calculateDeliveryCost(cart, dto.country, dto.city, dto.region);
  }

  private calculateDeliveryCost(
    cart: Cart[],
    country: string,
    city: string,
    region: string,
  ): number {
    let boxes = 0;
    cart.forEach(cartItem => {
      boxes += cartItem.quantity / cartItem.product.quantityInBox;
    });
    if (boxes < 1) {
      boxes = 1;
    }
    // Delivery charges per box in cedis
    const deliveryCharges = {
      tamale: 25,
      northern: 35,
      other: 60,
    };
    if (country.toLowerCase() !== "ghana") {
      return -1;
    }
    let charge = deliveryCharges.other;
    if (city.toLowerCase() === "tamale") {
      charge = deliveryCharges.tamale;
    } else if (region.toLowerCase() === "northern") {
      charge = deliveryCharges.northern;
    }
    return boxes * charge;
  }
}
