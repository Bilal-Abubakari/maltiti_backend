import { IsNotEmpty } from "class-validator";
import { Optional } from "@nestjs/common";
import { paymentStatus, status } from "../interfaces/checkout.interface";

export class InitializeTransaction {
  @IsNotEmpty()
  public amount: string;

  @IsNotEmpty()
  public email: string;

  @Optional()
  public extraInfo: string;

  @IsNotEmpty()
  public name: string;

  @IsNotEmpty()
  public location: string;
}

export class OrderStatus {
  public status: status;
}

export class PaymentStatus {
  public status: paymentStatus;
}
