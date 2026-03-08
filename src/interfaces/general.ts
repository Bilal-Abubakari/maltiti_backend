import { Cooperative } from "../entities/Cooperative.entity";
import { CooperativeMember } from "../entities/CooperativeMember.entity";
import { User } from "../entities/User.entity";
import { Checkout } from "../entities/Checkout.entity";
import { Cart } from "../entities/Cart.entity";
import { Customer } from "../entities/Customer.entity";
import { QueryRunner } from "typeorm";
import { CartItemDto } from "../dto/cartResponse.dto";
import { PaymentData } from "./payment.interface";

export interface IResponse<T> {
  message: string;
  data: T;
}

export interface IPagination<T> {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  items: T[];
}

export type IPaginatedResponse<T> = IResponse<IPagination<T>>;

export interface ordersPagination {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  orders: Checkout[];
}

export interface cooperativesPagination {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  cooperatives: Cooperative[];
}

export interface cooperativeMembersPagination {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  members: CooperativeMember[];
}

export interface cooperativeMemberPagination {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  members: CooperativeMember;
}

export interface product {
  image: string;
  quantityInBox: string;
  rating: string;
  weight: string;
  description: string;
  inBoxPrice: string;
  retail: string;
  createdAt: Date;
  wholesale: string;
  size: string;
  reviews: string;
  name: string;
  ingredients: string[];
  id: string;
  category: string;
  favorite: boolean;
  status: string;
  updatedAt: Date;
}

export interface IBestProducts {
  totalItems: number;
  data: product[];
}

export interface IUserToken {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ICartData {
  items: CartItemDto[];
  count: number;
  total: number;
}

export interface CheckoutOptions {
  carts: Cart[];
  customer: Customer;
  deliveryCost: number;
  isPlaceOrder: boolean;
  queryRunner: QueryRunner;
  paymentInitData?: { user?: User; email?: string };
  guestEmail?: string;
}

export interface CheckoutResponse {
  status: boolean;
  message: string;
  data: { saleId: string; awaitingDelivery: boolean };
}

export interface ProcessCheckoutResult {
  checkout: Checkout;
  response?: CheckoutResponse;
  paymentData?: PaymentData;
}
