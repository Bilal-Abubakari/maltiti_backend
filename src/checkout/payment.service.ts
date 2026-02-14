import { Injectable } from "@nestjs/common";
import axios from "axios";
import { Checkout } from "../entities/Checkout.entity";
import { User } from "../entities/User.entity";
import {
  IInitalizeTransactionData,
  IInitializeTransactionResponse,
} from "../interfaces/general";
@Injectable()
export class PaymentService {
  public async initializePaystack(
    checkout: Checkout,
    user: User,
    totalAmount: number,
  ): Promise<{
    data: IInitializeTransactionResponse<IInitalizeTransactionData>;
  }> {
    return await axios.post(
      `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        amount: Math.round(totalAmount * 100),
        email: user.email,
        reference: `${checkout.sale.id}`,
        callback_url: `${process.env.FRONTEND_URL}/confirm-payment/${checkout.sale.id}`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
  }
  public async initializeGuestPaystack(
    checkout: Checkout,
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
        reference: `${checkout.sale.id}`,
        callback_url: `${process.env.FRONTEND_URL}/confirm-payment/${checkout.sale.id}`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
  }
  public async verifyPayment(saleId: string): Promise<void> {
    await axios.get(
      `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${saleId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
  }
  public async refundPayment(reference: string): Promise<void> {
    await axios.post(
      `${process.env.PAYSTACK_BASE_URL}/refund/`,
      { transaction: reference },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
  }
}
