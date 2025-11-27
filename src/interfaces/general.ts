import { Cooperative } from "../entities/Cooperative.entity";
import { CooperativeMember } from "../entities/CooperativeMember.entity";
import { User } from "../entities/User.entity";
import { Checkout } from "../entities/Checkout.entity";

export interface IResponse<T> {
  message: string;
  data: T;
}

export interface IInitializeTransactionResponse<T> extends IResponse<T> {
  status: boolean;
}

export interface IInitalizeTransactionData {
  authorization_url: string;
  access_code: string;
  reference: string;
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
  stockQuantity: string;
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
