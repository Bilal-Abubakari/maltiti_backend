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

@Injectable()
export class SaleCreationService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly stockManagementService: StockManagementService,
    private readonly lineItemManagementService: LineItemManagementService,
  ) {}

  public async createSale(
    createSaleDto: CreateSaleDto,
  ): Promise<SaleResponseDto> {
    const {
      customerId,
      orderStatus = OrderStatus.PENDING,
      paymentStatus = PaymentStatus.INVOICE_REQUESTED,
      lineItems,
    } = createSaleDto;

    const customer = await this.customerRepository.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found`);
    }

    const validatedLineItems: SaleLineItem[] =
      await this.lineItemManagementService.validateLineItems(lineItems);

    await this.stockManagementService.validateAndDeductStock(
      validatedLineItems,
    );

    const sale = this.saleRepository.create({
      customer,
      orderStatus,
      paymentStatus,
      lineItems: validatedLineItems,
    });

    const savedSale = await this.saleRepository.save(sale);
    return transformSaleToResponseDto(savedSale);
  }
}
