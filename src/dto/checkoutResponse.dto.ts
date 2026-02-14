import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SaleDto } from "./sales/sale.dto";

export class UserDto {
  @ApiProperty()
  public id: string;

  @ApiProperty()
  public email: string;

  @ApiProperty()
  public name: string;

  @ApiProperty()
  public password: string;

  @ApiProperty()
  public userType: string;

  @ApiProperty()
  public phoneNumber: string;

  @ApiProperty()
  public avatarUrl: string;

  @ApiProperty()
  public permissions: string;

  @ApiProperty()
  public mustChangePassword: boolean;

  @ApiProperty()
  public rememberToken: string;

  @ApiProperty()
  public status: string;
}

export class CustomerDto {
  @ApiProperty()
  public id: string;

  @ApiProperty()
  public name: string;

  @ApiProperty()
  public phone: string;

  @ApiProperty()
  public email: string;

  @ApiProperty()
  public address: string;

  @ApiProperty()
  public country: string;

  @ApiProperty()
  public region: string;

  @ApiProperty()
  public city: string;

  @ApiProperty()
  public phoneNumber: string;

  @ApiProperty()
  public extraInfo: string;

  @ApiProperty({ type: () => [SaleDto] })
  public sales: SaleDto[];

  @ApiProperty({ type: () => UserDto })
  public user: UserDto;

  @ApiProperty()
  public createdAt: Date;

  @ApiProperty()
  public updatedAt: Date;

  @ApiProperty()
  public deletedAt: Date;
}

export class CheckoutDto {
  @ApiProperty()
  public id: string;

  @ApiProperty({ type: () => SaleDto })
  public sale: SaleDto;

  @ApiProperty({ type: () => [CartDto] })
  public carts: CartDto[];

  @ApiProperty()
  public paystackReference: string;

  @ApiProperty()
  public createdAt: Date;

  @ApiProperty()
  public updatedAt: Date;

  @ApiProperty()
  public deletedAt: Date;
}

export class CartDto {
  // Define CartDto fields, but to save time, assume minimal
  @ApiProperty()
  public id: string;

  // Add other fields as needed
}

export class OrdersPaginationDto {
  @ApiProperty()
  public totalItems: number;

  @ApiProperty()
  public currentPage: number;

  @ApiProperty()
  public totalPages: number;

  @ApiProperty({ type: [CheckoutDto] })
  public orders: CheckoutDto[];
}

export class CheckoutsResponseDto {
  @ApiProperty()
  public message: string;

  @ApiProperty({ type: [CheckoutDto] })
  public data: CheckoutDto[];
}

export class CheckoutResponseDto {
  @ApiProperty()
  public message: string;

  @ApiProperty({ type: CheckoutDto })
  public data: CheckoutDto;
}

export class OrdersPaginationResponseDto {
  @ApiProperty()
  public message: string;

  @ApiProperty({ type: OrdersPaginationDto })
  public data: OrdersPaginationDto;
}

export class DeliveryResponseDto {
  @ApiProperty()
  public message: string;

  @ApiProperty()
  public data: number;
}

export class SaleResponseDto {
  @ApiProperty()
  public message: string;

  @ApiProperty({ type: SaleDto })
  public data: SaleDto;
}

export class InitializeTransactionDataDto {
  @ApiProperty()
  public authorization_url: string;

  @ApiProperty()
  public access_code: string;

  @ApiProperty()
  public reference: string;
}

export class InitializeTransactionResponseDto {
  @ApiProperty()
  public message: string;

  @ApiProperty()
  public status: boolean;

  @ApiProperty({ type: InitializeTransactionDataDto })
  public data: InitializeTransactionDataDto;
}

export class SaleLineItemDto {
  @ApiProperty()
  public productId: string;

  @ApiProperty({
    type: () => [
      {
        batchId: { type: "string" },
        quantity: { type: "number" },
      },
    ],
  })
  public batchAllocations: { batchId: string; quantity: number }[];

  @ApiProperty()
  public requestedQuantity: number;

  @ApiProperty()
  public customPrice?: number;

  @ApiProperty()
  public finalPrice: number;
}
