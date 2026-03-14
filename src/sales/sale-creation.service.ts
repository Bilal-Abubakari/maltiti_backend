import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { CreateSaleDto } from "../dto/sales/createSale.dto";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { StockManagementService } from "./stock-management.service";
import { LineItemManagementService } from "./line-item-management.service";
import { transformSaleToResponseDto } from "../utils/sale-mapper.util";
import { NotificationService } from "../notification/notification.service";
import { NotificationIntegrationService } from "../notification/notification-integration.service";
import { SaleDocumentEmailService } from "./sale-document-email.service";
import { userOrderId } from "../utils/product.utils";
import { ProductDisplayService } from "./product-display.service";

@Injectable()
export class SaleCreationService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly stockManagementService: StockManagementService,
    private readonly lineItemManagementService: LineItemManagementService,
    private readonly notificationService: NotificationService,
    private readonly notificationIntegrationService: NotificationIntegrationService,
    private readonly saleDocumentEmailService: SaleDocumentEmailService,
    private readonly productDisplayService: ProductDisplayService,
  ) {}

  public async createSale(
    createSaleDto: CreateSaleDto,
  ): Promise<SaleResponseDto> {
    const {
      customerId,
      orderStatus = OrderStatus.PENDING,
      paymentStatus = PaymentStatus.INVOICE_REQUESTED,
      lineItems,
      deliveryFee,
    } = createSaleDto;

    const customer = await this.customerRepository.findOne({
      where: { id: customerId, deletedAt: IsNull() },
      relations: ["user"],
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found`);
    }

    const validatedLineItems: SaleLineItem[] =
      await this.lineItemManagementService.validateLineItems(lineItems);

    if (orderStatus !== OrderStatus.PENDING) {
      await this.stockManagementService.validateAndDeductStock(
        validatedLineItems,
      );
    }

    const subtotal = this.calculateSubtotal(validatedLineItems);

    const sale = this.saleRepository.create({
      customer,
      amount: subtotal,
      paymentStatus,
      lineItems: validatedLineItems,
      deliveryFee,
      orderStatus,
    });

    const savedSale = await this.saleRepository.save(sale);
    const saleResponse = transformSaleToResponseDto(savedSale);

    await this.sendOrderConfirmationEmail(saleResponse, customer);
    await this.saleDocumentEmailService.sendDocumentEmailForSale(
      savedSale,
      customer,
    );
    await this.sendInAppNotificationIfUser(saleResponse, customer);

    return saleResponse;
  }

  private calculateSubtotal(lineItems: SaleLineItem[]): number {
    return lineItems.reduce((total, item) => {
      const price = item.finalPrice ?? item.customPrice ?? 0;
      return total + price * item.requestedQuantity;
    }, 0);
  }

  private async sendOrderConfirmationEmail(
    sale: SaleResponseDto,
    customer: Customer,
  ): Promise<void> {
    if (!customer.email) {
      return;
    }

    const orderItems = await Promise.all(
      sale.lineItems.map(async item => {
        const productName =
          await this.productDisplayService.resolveProductDisplayName(
            item.productId,
            item.productName,
          );
        return {
          productName,
          quantity: item.requestedQuantity,
          unitPrice: Number(item.finalPrice).toFixed(2),
          lineTotal: (item.requestedQuantity * Number(item.finalPrice)).toFixed(
            2,
          ),
        };
      }),
    );

    const subtotal =
      sale.amount == null ? undefined : Number(sale.amount).toFixed(2);
    const deliveryFee =
      sale.deliveryFee != null && Number(sale.deliveryFee) > 0
        ? Number(sale.deliveryFee).toFixed(2)
        : undefined;
    const serviceFee =
      sale.serviceFee != null && Number(sale.serviceFee) > 0
        ? Number(sale.serviceFee).toFixed(2)
        : undefined;
    const grandTotal =
      sale.total == null ? undefined : Number(sale.total).toFixed(2);

    const deliveryAddress =
      [customer.address, customer.city, customer.region, customer.country]
        .filter(Boolean)
        .join(", ") || undefined;

    await this.notificationService.sendSaleCreationEmail({
      customerEmail: customer.email,
      customerName: customer.name,
      customerPhone: customer.phone ?? customer.phoneNumber ?? undefined,
      customerCity: customer.city ?? undefined,
      customerRegion: customer.region ?? undefined,
      orderId: sale.id,
      orderReference: userOrderId(sale.id),
      orderDate: new Date(sale.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      orderStatus: sale.orderStatus.replaceAll("_", " "),
      orderStatusClass: sale.orderStatus,
      paymentStatus: sale.paymentStatus.replaceAll("_", " "),
      paymentStatusClass: sale.paymentStatus,
      deliveryAddress,
      orderItems,
      subtotal,
      deliveryFee,
      serviceFee,
      grandTotal,
    });
  }

  private async sendInAppNotificationIfUser(
    sale: SaleResponseDto,
    customer: Customer,
  ): Promise<void> {
    if (!customer.user?.id) {
      return;
    }

    const adminUserIds = await this.notificationService.getAdminUserIds();
    const total = sale.total ?? 0;

    await this.notificationIntegrationService.notifyOrderCreated(
      customer.user.id,
      userOrderId(sale.id),
      total,
      customer.name,
      adminUserIds,
    );
  }
}
