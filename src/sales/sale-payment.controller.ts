import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { SalePaymentService } from "./sale-payment.service";
import {
  RecordSalePaymentDto,
  UpdatePaymentRecordStatusDto,
} from "../dto/sales/salePayment.dto";
import {
  SalePaymentResponseDto,
  SalePaymentSummaryResponseDto,
} from "../dto/sales/salePaymentResponse.dto";
import { TokenAuthGuard } from "../authentication/guards/token-auth.guard";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";
import { AuditLog } from "../interceptors/audit.interceptor";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { IResponse } from "../interfaces/general";

/**
 * Controller for managing individual payment records linked to a specific sale.
 *
 * A sale can be paid for in multiple instalments. Each instalment is recorded
 * as a `SalePayment` entry. Once the cumulative confirmed amount meets or
 * exceeds the sale's grand total the sale's `paymentStatus` is automatically
 * set to `PAID`.
 *
 * Base path: `/sales/:saleId/payments`
 */
@ApiTags("Sale Payments")
@ApiBearerAuth()
@Controller("sales/:saleId/payments")
export class SalePaymentController {
  constructor(private readonly salePaymentService: SalePaymentService) {}

  // ---------------------------------------------------------------------------
  // Public endpoints (admin + super-admin)
  // ---------------------------------------------------------------------------

  /**
   * Record a new payment against a sale.
   *
   * This endpoint is used to record any payment – whether it is a manual
   * bank transfer / cash payment recorded by an admin, or a customer-initiated
   * Paystack payment captured before it reaches the Paystack gateway.
   *
   * After recording, the service automatically marks the sale as `PAID` if
   * the cumulative confirmed amount meets or exceeds the grand total.
   */
  @Post()
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @ApiOperation({
    summary: "Record a payment for a sale",
    description:
      "Record a new payment (full or partial) against a sale. " +
      "Set `isCustomerInitiated` to `true` when recording a payment initiated by the customer " +
      "(e.g., before redirecting to Paystack). " +
      "The sale's `paymentStatus` is automatically updated to `PAID` once confirmed " +
      "payments equal or exceed the grand total.",
  })
  @ApiParam({ name: "saleId", description: "ID of the sale", type: String })
  @ApiResponse({
    status: 201,
    description: "Payment recorded successfully.",
    type: SalePaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid payment amount or sale state.",
  })
  @ApiResponse({ status: 404, description: "Sale not found." })
  @AuditLog({
    actionType: AuditActionType.PAYMENT_RECORDED,
    entityType: AuditEntityType.PAYMENT,
    description: "Recorded a payment for a sale",
    getEntityId: (result: Record<string, unknown>) =>
      (result?.data as Record<string, unknown>)?.id as string,
  })
  public async recordPayment(
    @Param("saleId") saleId: string,
    @Body() dto: RecordSalePaymentDto,
  ): Promise<IResponse<SalePaymentResponseDto>> {
    const payment = await this.salePaymentService.recordPayment(saleId, dto);
    return {
      message: "Payment recorded successfully.",
      data: payment,
    };
  }

  /**
   * Retrieve all payment records for a sale, including a financial summary.
   *
   * Accessible by admins and by customers (no guard) so that a customer can
   * view the payment history of their own order.
   */
  @Get()
  @ApiOperation({
    summary: "Get all payment records for a sale",
    description:
      "Returns all payment instalments for the specified sale together with " +
      "a summary: total sale amount, total confirmed paid, and outstanding balance.",
  })
  @ApiParam({ name: "saleId", description: "ID of the sale", type: String })
  @ApiResponse({
    status: 200,
    description: "Payment records retrieved successfully.",
    type: SalePaymentSummaryResponseDto,
  })
  @ApiResponse({ status: 404, description: "Sale not found." })
  public async getPaymentsForSale(
    @Param("saleId") saleId: string,
  ): Promise<IResponse<SalePaymentSummaryResponseDto>> {
    const summary = await this.salePaymentService.getPaymentsForSale(saleId);
    return {
      message: "Payment records retrieved successfully.",
      data: summary,
    };
  }

  /**
   * Retrieve a single payment record by its ID.
   */
  @Get(":paymentId")
  @ApiOperation({
    summary: "Get a specific payment record",
    description: "Returns the details of a single payment record for a sale.",
  })
  @ApiParam({ name: "saleId", description: "ID of the sale", type: String })
  @ApiParam({
    name: "paymentId",
    description: "ID of the payment record",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Payment record retrieved successfully.",
    type: SalePaymentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Sale or payment record not found.",
  })
  public async getPaymentRecord(
    @Param("saleId") saleId: string,
    @Param("paymentId") paymentId: string,
  ): Promise<IResponse<SalePaymentResponseDto>> {
    const payment = await this.salePaymentService.getPaymentRecord(
      saleId,
      paymentId,
    );
    return {
      message: "Payment record retrieved successfully.",
      data: payment,
    };
  }

  /**
   * Update the status of a payment record (e.g., mark as CONFIRMED or FAILED).
   *
   * When a payment is updated to CONFIRMED the service rechecks the sale total
   * and may automatically flip the sale's `paymentStatus` to `PAID`.
   */
  @Patch(":paymentId/status")
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @ApiOperation({
    summary: "Update the status of a payment record",
    description:
      "Update the status of an existing payment record (e.g., from PENDING to CONFIRMED). " +
      "If the updated status is CONFIRMED and the cumulative confirmed amount reaches the " +
      "sale grand total, the sale is automatically marked as PAID.",
  })
  @ApiParam({ name: "saleId", description: "ID of the sale", type: String })
  @ApiParam({
    name: "paymentId",
    description: "ID of the payment record",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Payment record status updated successfully.",
    type: SalePaymentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Sale or payment record not found.",
  })
  @AuditLog({
    actionType: AuditActionType.PAYMENT_STATUS_UPDATED,
    entityType: AuditEntityType.PAYMENT,
    description: "Updated payment record status",
    getEntityId: (result: Record<string, unknown>) =>
      (result?.data as Record<string, unknown>)?.id as string,
  })
  public async updatePaymentStatus(
    @Param("saleId") saleId: string,
    @Param("paymentId") paymentId: string,
    @Body() dto: UpdatePaymentRecordStatusDto,
  ): Promise<IResponse<SalePaymentResponseDto>> {
    const payment = await this.salePaymentService.updatePaymentStatus(
      saleId,
      paymentId,
      dto,
    );
    return {
      message: "Payment record status updated successfully.",
      data: payment,
    };
  }
}
