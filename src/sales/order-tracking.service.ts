import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { PaymentStatus } from "../enum/payment-status.enum";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import { transformSaleToResponseDto } from "../utils/sale-mapper.util";
import { PaymentService } from "../checkout/payment.service";
import {
  IInitializeTransactionData,
  IInitializeTransactionResponse,
} from "../interfaces/payment.interface";
import { generatePaymentReference } from "../utils/payment.utils";

@Injectable()
export class OrderTrackingService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly paymentService: PaymentService, // Inject PaymentService
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
  ): Promise<IInitializeTransactionResponse<IInitializeTransactionData>> {
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
    const totalAmount =
      Number(sale.amount ?? 0) + Number(sale.deliveryFee ?? 0);

    const useEmail = guestEmail || customerEmail;
    const reference = generatePaymentReference(sale.id);
    sale.paymentReference = reference;
    await this.saleRepository.save(sale);
    const response = await this.paymentService.initializePayment(
      sale.id,
      reference,
      useEmail,
      totalAmount,
    );
    sale.paymentStatus = PaymentStatus.PENDING_PAYMENT;
    await this.saleRepository.save(sale);
    return response;
  }
}
