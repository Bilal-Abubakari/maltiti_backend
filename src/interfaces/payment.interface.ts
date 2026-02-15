import { IResponse } from "./general";

export interface IInitializeTransactionResponse<T> extends IResponse<T> {
  status: boolean;
}

export interface IInitializeTransactionData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaymentData {
  saleId: string;
  email: string;
  totalAmount: number;
}

export type PaymentInitializationApiResponse =
  IInitializeTransactionResponse<IInitializeTransactionData>;
