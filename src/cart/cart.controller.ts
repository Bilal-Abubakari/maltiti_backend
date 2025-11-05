import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../authentication/guards/jwt-auth.guard";
import { CartService } from "./cart.service";
import { IResponse } from "../interfaces/general";
import { Cart } from "../entities/Cart.entity";
import { DeleteResult } from "typeorm";
import { AddCartDto, AddQuantityDto } from "../dto/addCart.dto";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import { Role } from "../enum/role.enum";

@Controller("cart")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(":id")
  @Roles([Role.User])
  public async getCart(
    @Param("id") id: string,
  ): Promise<IResponse<[Cart[], number, number]>> {
    const response = await this.cartService.getCustomerCart(id);
    return {
      message: "Customer cart loaded successfully",
      data: response,
    };
  }

  @Delete(":id")
  @Roles([Role.User])
  public async removeFromCart(
    @Param("id") id: string,
  ): Promise<IResponse<DeleteResult>> {
    const response = await this.cartService.removeFromCart(id);
    return {
      message: "Product removed from cart successfully",
      data: response,
    };
  }

  @Post(":id")
  @Roles([Role.User])
  public async addToCart(
    @Param("id") id: string,
    @Body() addCart: AddCartDto,
  ): Promise<IResponse<Cart>> {
    const response = await this.cartService.addToCart(id, addCart);
    return {
      message: "Product added to cart successfully",
      data: response,
    };
  }

  @Patch(":id")
  @Roles([Role.User])
  public async addQuantity(
    @Param("id") id: string,
    @Body() addQuantity: AddQuantityDto,
  ): Promise<IResponse<[Cart[], number, number]>> {
    const response = await this.cartService.addQuantity(id, addQuantity);
    return {
      message: "Product quantity added successfully",
      data: response,
    };
  }

  @Delete("all-cart/:id")
  @Roles([Role.User])
  public async removeAllFromCart(
    @Param("id") id: string,
  ): Promise<IResponse<DeleteResult>> {
    const response = await this.cartService.removeAllFromCart(id);
    return {
      message: "All Products removed from cart successfully",
      data: response,
    };
  }
}
