import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { SalePayment } from "../entities/SalePayment.entity";
import {
  RecordSalePaymentDto,
  UpdatePaymentRecordStatusDto,
} from "../dto/sales/salePayment.dto";
import {
  SalePaymentResponseDto,
  SalePaymentSummaryResponseDto,
} from "../dto/sales/salePaymentResponse.dto";
import { PaymentStatus } from "../enum/payment-status.enum";
import { PaymentRecordStatus } from "../enum/payment-record-status.enum";
import { calculateGrandTotal } from "../utils/payment-fee.util";

/**
 * Service responsible for managing individual payment records associated with sales.
 * Supports partial / instalment payments and automatically updates the sale's
 * payment status when the confirmed payments meet or exceed the grand total.
 */
@Injectable()
export class SalePaymentService {
  private readonly logger = new Logger(SalePaymentService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(SalePayment)
    private readonly salePaymentRepository: Repository<SalePayment>,
  ) {}

  /**
   * Record a new payment against a sale.
   * After saving, recalculates the cumulative confirmed total and marks
   * the sale as PAID if the total meets or exceeds the grand total.
   *
   * @param saleId - The ID of the sale to record the payment for.
   * @param dto - Payment details.
   * @returns The created payment record as a response DTO.
   */
  public async recordPayment(
    saleId: string,
    dto: RecordSalePaymentDto,
  ): Promise<SalePaymentResponseDto> {
    const sale = await this.findSaleOrFail(saleId);

    if (dto.amount <= 0) {
      throw new BadRequestException(
        "Payment amount must be greater than zero.",
      );
    }

    const payment = this.salePaymentRepository.create({
      sale,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      status: dto.status,
      reference: dto.reference ?? null,
      note: dto.note ?? null,
      isCustomerInitiated: dto.isCustomerInitiated ?? false,
    });

    const saved = await this.salePaymentRepository.save(payment);

    this.logger.log(
      `Recorded payment of ${dto.amount} for sale ${saleId} via ${dto.paymentMethod} (status: ${dto.status})`,
    );

    // Re-evaluate and potentially auto-mark the sale as PAID
    await this.syncSalePaymentStatus(sale);

    return this.toResponseDto(saved, saleId);
  }

  /**
   * Retrieve all payment records for a specific sale, along with a summary.
   *
   * @param saleId - The ID of the sale.
   * @returns A summary object with all payments, total paid, and balance remaining.
   */
  public async getPaymentsForSale(
    saleId: string,
  ): Promise<SalePaymentSummaryResponseDto> {
    const sale = await this.findSaleOrFail(saleId);

    const payments = await this.salePaymentRepository.find({
      where: { sale: { id: saleId }, deletedAt: IsNull() },
      order: { createdAt: "ASC" },
    });

    const grandTotal = this.computeGrandTotal(sale);

    const totalPaid = payments
      .filter(p => p.status === PaymentRecordStatus.CONFIRMED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const balanceRemaining = Math.max(0, grandTotal - totalPaid);
    const isFullyPaid = totalPaid >= grandTotal;

    return {
      saleId,
      saleTotal: grandTotal,
      totalPaid: Number(totalPaid.toFixed(2)),
      balanceRemaining: Number(balanceRemaining.toFixed(2)),
      isFullyPaid,
      payments: payments.map(p => this.toResponseDto(p, saleId)),
    };
  }

  /**
   * Update the status of a specific payment record.
   * After updating, recalculates and potentially marks the sale as PAID.
   *
   * @param saleId - The sale ID the payment belongs to.
   * @param paymentId - The payment record ID.
   * @param dto - The updated status and optional note.
   * @returns The updated payment record as a response DTO.
   */
  public async updatePaymentStatus(
    saleId: string,
    paymentId: string,
    dto: UpdatePaymentRecordStatusDto,
  ): Promise<SalePaymentResponseDto> {
    const sale = await this.findSaleOrFail(saleId);

    const payment = await this.salePaymentRepository.findOne({
      where: { id: paymentId, sale: { id: saleId }, deletedAt: IsNull() },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment record with ID "${paymentId}" not found for sale "${saleId}".`,
      );
    }

    payment.status = dto.status;
    if (dto.note !== undefined) {
      payment.note = dto.note;
    }

    const updated = await this.salePaymentRepository.save(payment);

    this.logger.log(
      `Updated payment ${paymentId} status to ${dto.status} for sale ${saleId}`,
    );

    // Re-evaluate sale payment status
    await this.syncSalePaymentStatus(sale);

    return this.toResponseDto(updated, saleId);
  }

  /**
   * Retrieve a single payment record by ID.
   *
   * @param saleId - The sale ID the payment belongs to.
   * @param paymentId - The payment record ID.
   * @returns The payment record as a response DTO.
   */
  public async getPaymentRecord(
    saleId: string,
    paymentId: string,
  ): Promise<SalePaymentResponseDto> {
    // Ensure the sale exists first
    await this.findSaleOrFail(saleId);

    const payment = await this.salePaymentRepository.findOne({
      where: { id: paymentId, sale: { id: saleId }, deletedAt: IsNull() },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment record with ID "${paymentId}" not found for sale "${saleId}".`,
      );
    }

    return this.toResponseDto(payment, saleId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Finds a sale by ID or throws NotFoundException.
   */
  private async findSaleOrFail(saleId: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found.`);
    }

    return sale;
  }

  /**
   * Computes the grand total for a sale (product amount + delivery + service fee).
   */
  private computeGrandTotal(sale: Sale): number {
    const productTotal = Number(sale.amount ?? 0);
    const deliveryFee = Number(sale.deliveryFee ?? 0);
    const serviceFee = Number(sale.serviceFee ?? 0);

    if (productTotal + deliveryFee === 0) {
      return 0;
    }

    return calculateGrandTotal(productTotal, deliveryFee, serviceFee);
  }

  /**
   * Recalculates the total confirmed payments for a sale and marks the sale
   * as PAID if the cumulative amount meets or exceeds the grand total.
   */
  private async syncSalePaymentStatus(sale: Sale): Promise<void> {
    const grandTotal = this.computeGrandTotal(sale);

    if (grandTotal <= 0) {
      return;
    }

    const confirmedPayments = await this.salePaymentRepository.find({
      where: {
        sale: { id: sale.id },
        status: PaymentRecordStatus.CONFIRMED,
        deletedAt: IsNull(),
      },
    });

    const totalConfirmed = confirmedPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    if (
      totalConfirmed >= grandTotal &&
      sale.paymentStatus !== PaymentStatus.PAID
    ) {
      sale.paymentStatus = PaymentStatus.PAID;
      await this.saleRepository.save(sale);

      this.logger.log(
        `Sale ${sale.id} automatically marked as PAID. ` +
          `Total confirmed: ${totalConfirmed}, Grand total: ${grandTotal}`,
      );
    }
  }

  /**
   * Maps a SalePayment entity to the response DTO.
   */
  private toResponseDto(
    payment: SalePayment,
    saleId: string,
  ): SalePaymentResponseDto {
    return {
      id: payment.id,
      saleId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      reference: payment.reference,
      note: payment.note,
      isCustomerInitiated: payment.isCustomerInitiated,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
