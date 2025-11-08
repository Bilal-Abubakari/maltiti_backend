import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Cart } from "../entities/Cart.entity";
import { IsNull, Repository, UpdateResult } from "typeorm";
import { boxesCharge } from "../utils/constants";
import axios from "axios";
import * as process from "process";
import {
  InitializeTransaction,
  OrderStatus,
  PaymentStatus,
} from "../dto/checkout.dto";
import { Checkout } from "../entities/Checkout.entity";
import {
  IInitalizeTransactionData,
  IInitializeTransactionResponse,
  ordersPagination,
} from "../interfaces/general";
import { paymentStatus, status } from "../interfaces/checkout.interface";
import { NotificationService } from "../notification/notification.service";

@Injectable()
export class CheckoutService {
  constructor(
    private readonly userService: UsersService,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Checkout)
    private readonly checkoutRepository: Repository<Checkout>,
    private notificationService: NotificationService,
  ) {}
  public async getTransportation(
    id: string,
    location: "local" | "other",
  ): Promise<number> {
    const user = await this.userService.findOne(id);
    const cart = await this.cartRepository.findBy({ user });

    let boxes = 0;

    cart.forEach(cartItem => {
      boxes += cartItem.quantity / cartItem.product.quantityInBox;
    });

    if (boxes < 1) {
      boxes = 1;
    }

    return (
      boxes * (location === "local" ? boxesCharge.Tamale : boxesCharge.Other)
    );
  }

  public async initializeTransaction(
    id: string,
    data: InitializeTransaction,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const checkout = new Checkout();
    const user = await this.userService.findOne(id);
    const cartsToUpdate = await this.cartRepository.findBy({
      user,
      checkout: IsNull(),
    });
    cartsToUpdate.forEach(cart => {
      cart.checkout = checkout;
    });
    checkout.user = user;
    checkout.orderStatus = "review";
    checkout.paymentStatus = "unpaid";
    checkout.extraInfo = data.extraInfo;
    checkout.location = data.location;
    checkout.name = data.name;
    checkout.amount = data.amount;
    try {
      const response = await axios.post(
        `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          ...data,
          reference: `${id}=${checkout.id}`,
          email: user.email,
          callback_url: `${process.env.FRONTEND_URL}/confirm-payment/${id}/${checkout.id}`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        },
      );
      await this.checkoutRepository.save(checkout);
      await this.cartRepository.save(cartsToUpdate);
      await this.notificationService.sendSms(
        "233557309018",
        "A new order has been placed. Please visit the admin dashboard",
      );
      await this.notificationService.sendEmail(
        "A new order has been placed. Please visit the admin dashboard",
        "bilal.abubakari@maltitiaenterprise.com",
        "Order Received",
        user.name,
        process.env.ADMIN_URL,
        "Go",
        "Go",
      );
      await this.notificationService.sendSms(
        user.phoneNumber,
        "Your order has been placed and currently in review",
      );
      await this.notificationService.sendEmail(
        "Your order has been received and it currently in review",
        user.email,
        "Order Received",
        user.name,
        process.env.APP_URL,
        "Go",
        "Go",
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async confirmPayment(
    userId: string,
    checkoutId: string,
  ): Promise<Checkout> {
    const user = await this.userService.findOne(userId);
    try {
      await axios.get(
        `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${userId}=${checkoutId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        },
      );
      const checkout = await this.checkoutRepository.findOneBy({
        id: checkoutId,
      });
      checkout.paymentStatus = "paid";
      await this.notificationService.sendSms(
        user.phoneNumber,
        "Your payment has been received, your order is already in progress",
      );
      await this.notificationService.sendEmail(
        "Your payment has been received, your order is already in progress",
        user.email,
        "Payment Confirmation",
        user.name,
        process.env.APP_URL,
        "Go",
        "Go",
      );
      return this.checkoutRepository.save(checkout);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async getOrders(id: string): Promise<Checkout[]> {
    const user = await this.userService.findOne(id);
    return this.checkoutRepository.findBy({ user });
  }

  public async getOrder(id: string): Promise<Checkout> {
    const checkout = await this.checkoutRepository.findOneBy({ id });
    await checkout.carts;
    await checkout.user;
    return checkout;
  }

  public async getAllOrders(
    page: number = 1,
    limit: number = 10,
    searchTerm: string = "",
    orderStatus: status,
    paymentStatus: paymentStatus,
  ): Promise<ordersPagination> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.checkoutRepository.createQueryBuilder("checkout");

    queryBuilder.leftJoinAndSelect("checkout.carts", "carts");

    queryBuilder.leftJoinAndSelect("carts.product", "product");

    queryBuilder.leftJoinAndSelect("checkout.user", "user");

    // queryBuilder.leftJoinAndSelect('user.phoneNumber', 'phoneNumber');

    if (searchTerm) {
      queryBuilder.where("LOWER(checkout.name) LIKE LOWER(:searchTerm)", {
        searchTerm: `%${searchTerm.toLowerCase()}%`,
      });
    }

    if (orderStatus) {
      queryBuilder.andWhere(
        "LOWER(checkout.orderStatus) = LOWER(:orderStatus)",
        {
          orderStatus,
        },
      );
    }
    if (paymentStatus) {
      queryBuilder.andWhere("LOWER(checkout.paymentStatus) = :paymentStatus", {
        paymentStatus: paymentStatus,
      });
    }

    queryBuilder.orderBy("checkout.createdAt", "DESC");

    const [orders, totalItems] = await queryBuilder
      .skip(skip)
      .take(10)
      .getManyAndCount();

    return {
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      orders,
    };
  }

  public async orderStatus(
    id: string,
    data: OrderStatus,
  ): Promise<UpdateResult> {
    const checkout = await this.checkoutRepository.findOne({ where: { id } });
    const user = await checkout.user;
    await this.notificationService.sendSms(
      user.phoneNumber,
      "Your order status been updated to: " + data.status,
    );
    await this.notificationService.sendEmail(
      "Your order status been updated to: " + data.status,
      user.email,
      "Order Status",
      user.name,
      process.env.APP_URL,
      "Go",
      "Go",
    );
    return await this.checkoutRepository.update(
      { id },
      { orderStatus: data.status },
    );
  }

  public async paymentStatus(
    id: string,
    data: PaymentStatus,
  ): Promise<UpdateResult> {
    const checkout = await this.checkoutRepository.findOne({ where: { id } });
    const user = await checkout.user;
    await this.notificationService.sendSms(
      user.phoneNumber,
      "Your order payment status has been updated to " + data.status,
    );
    await this.notificationService.sendEmail(
      "Your order payment status has been updated to " + data.status,
      user.email,
      "Payment Status",
      user.name,
      process.env.APP_URL,
      "Go",
      "Go",
    );
    return await this.checkoutRepository.update(
      { id },
      { paymentStatus: data.status },
    );
  }

  public async cancelOrder(id: string): Promise<Checkout> {
    const order = await this.checkoutRepository.findOneByOrFail({ id });
    const user = await order.user;

    if (order.orderStatus === "cancelled") {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "This order is already cancelled",
        },
        HttpStatus.CONFLICT,
      );
    }

    order.orderStatus = "cancelled";

    if (
      order.orderStatus === "delivered" ||
      order.orderStatus === "delivery in progress"
    ) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error:
            "This order is already in progress or delivered and cannot be cancelled",
        },
        HttpStatus.CONFLICT,
      );
    }

    if (order.paymentStatus === "paid") {
      try {
        await axios.post(
          `${process.env.PAYSTACK_BASE_URL}/refund/`,
          { transaction: `${user.id}=${id}` },
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          },
        );
        order.paymentStatus = "refunded";
      } catch (error) {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: error.response?.data?.message || "Internal Server Error",
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
    await order.carts;
    await this.notificationService.sendSms(
      "233557309018",
      `${user.name} has cancelled the order with id ${order.id}`,
    );
    await this.notificationService.sendEmail(
      `${user.name} has cancelled the order with id ${order.id}`,
      "bilal.abubakari@maltitiaenterprise.com",
      "Order Cancelled",
      user.name,
      process.env.ADMIN_URL,
      "Go",
      "Go",
    );
    await this.notificationService.sendSms(
      user.phoneNumber,
      "Your order has been cancelled successfully, please do order again",
    );
    await this.notificationService.sendEmail(
      "Your order has been cancelled successfully, please do order again",
      user.email,
      "Order Cancelled",
      user.name,
      process.env.APP_URL,
      "Go",
      "Go",
    );
    return await this.checkoutRepository.save(order);
  }

  public async testMail(): Promise<void> {
    await this.notificationService.sendEmail(
      "This is a test mail",
      "abubakaribilal99@gmail.com",
      "Testing 1, 2, 3",
      "Bilal",
      process.env.APP_URL,
      "Go",
      "Go",
    );
  }
}
