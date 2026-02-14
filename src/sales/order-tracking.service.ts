import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import axios from "axios";
import { Sale } from "../entities/Sale.entity";
import { Checkout } from "../entities/Checkout.entity";
import { PaymentStatus } from "../enum/payment-status.enum";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import {
  IInitalizeTransactionData,
  IInitializeTransactionResponse,
} from "../interfaces/general";
import { transformSaleToResponseDto } from "../utils/sale-mapper.util";

@Injectable()
export class OrderTrackingService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Checkout)
    private readonly checkoutRepository: Repository<Checkout>,
  ) {}

  public async trackOrder(
    saleId: string,
    email: string,
  ): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: [
        "customer",
        "checkout",
        "checkout.carts",
        "checkout.carts.product",
      ],
    });
    if (!sale) {
      throw new NotFoundException("Order not found");
    }
    // Check if the email matches customer email or guest email (from checkout)
    const customerEmail = sale.customer.email;
    const guestEmail = sale.checkout?.guestEmail;
    if (
      email.toLowerCase() !== customerEmail?.toLowerCase() &&
      email.toLowerCase() !== guestEmail?.toLowerCase()
    ) {
      throw new BadRequestException("Email does not match order records");
    }
    // Transform the sale entity into the response DTO
    return transformSaleToResponseDto(sale);
  }

  public async payForOrder(
    saleId: string,
    email: string,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer", "checkout"],
    });
    if (!sale) {
      throw new NotFoundException("Order not found");
    }
    // Check if the email matches customer email or guest email (from checkout)
    const customerEmail = sale.customer.email;
    const guestEmail = sale.checkout?.guestEmail;
    if (
      email.toLowerCase() !== customerEmail?.toLowerCase() &&
      email.toLowerCase() !== guestEmail?.toLowerCase()
    ) {
      throw new BadRequestException("Email does not match order records");
    }
    // Check payment status
    if (
      sale.paymentStatus !== PaymentStatus.INVOICE_REQUESTED &&
      sale.paymentStatus !== PaymentStatus.PENDING_PAYMENT
    ) {
      throw new BadRequestException(
        `Cannot pay for order with payment status: ${sale.paymentStatus}`,
      );
    }
    // If there's no checkout, we can't process payment via Paystack
    if (!sale.checkout) {
      throw new BadRequestException(
        "This order does not have payment information. Please contact support.",
      );
    }

    // Calculate total from Sale fields
    const totalAmount = (sale.amount ?? 0) + (sale.deliveryFee ?? 0);

    const useEmail = guestEmail || customerEmail;
    const response = await this.initializePaystack(
      sale.id,
      useEmail,
      totalAmount,
    );
    sale.checkout.paystackReference = response.data.data.reference;
    sale.paymentStatus = PaymentStatus.PENDING_PAYMENT;
    await this.saleRepository.save(sale);
    await this.checkoutRepository.save(sale.checkout);
    return response.data;
  }
  private async initializePaystack(
    saleId: string,
    email: string,
    totalAmount: number,
  ): Promise<{
    data: IInitializeTransactionResponse<IInitalizeTransactionData>;
  }> {
    return await axios.post(
      `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        amount: Math.round(totalAmount * 100),
        email: email,
        reference: `sale=${saleId}`,
        callback_url: `${process.env.FRONTEND_URL}/track-order/${saleId}`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
  }
}
