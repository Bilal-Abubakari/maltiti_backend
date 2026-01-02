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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { CartService } from "./cart.service";
import { IResponse } from "../interfaces/general";
import { DeleteResult } from "typeorm";
import { AddCartDto, AddQuantityDto, BulkAddCartDto } from "../dto/addCart.dto";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import { Role } from "../enum/role.enum";
import { CurrentUser } from "../authentication/decorators/current-user.decorator";
import { User } from "../entities/User.entity";
import {
  GetCartResponseDto,
  CartResponseDto,
  DeleteCartResponseDto,
  BulkAddCartResponseDto,
  CartItemDto,
  CartDataDto,
} from "../dto/cartResponse.dto";
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from "../dto/authResponse.dto";

/**
 * Cart Controller
 * Handles shopping cart operations for authenticated users
 */
@ApiTags("Cart")
@ApiCookieAuth()
@Controller("cart")
@UseGuards(CookieAuthGuard, RolesGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({
    summary: "Get user's shopping cart",
    description:
      "Retrieves all cart items for the authenticated user with total count and price. Only returns items that have not been checked out.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Cart retrieved successfully. Returns array of cart items, total item count, and total price.",
    type: GetCartResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - user not authenticated",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    type: ErrorResponseDto,
  })
  @Get()
  @Roles([Role.User])
  public async getCart(
    @CurrentUser() user: User,
  ): Promise<IResponse<CartDataDto>> {
    const response = await this.cartService.getCustomerCart(user.id);
    return {
      message: "Customer cart loaded successfully",
      data: response,
    };
  }

  @ApiOperation({
    summary: "Remove item from cart",
    description:
      "Removes a specific item from the authenticated user's shopping cart. User can only delete their own cart items.",
  })
  @ApiParam({
    name: "id",
    description: "Cart item ID (UUID)",
    type: String,
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({
    status: 200,
    description: "Cart item removed successfully",
    type: DeleteCartResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - user not authenticated",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - user attempting to delete another user's cart item",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Cart item not found",
    type: ErrorResponseDto,
  })
  @Delete(":id")
  @Roles([Role.User])
  public async removeFromCart(
    @Param("id") id: string,
    @CurrentUser() user: User,
  ): Promise<IResponse<DeleteResult>> {
    const response = await this.cartService.removeFromCart(id, user.id);
    return {
      message: "Product removed from cart successfully",
      data: response,
    };
  }

  @ApiOperation({
    summary: "Add product to cart",
    description:
      "Adds a single product to the authenticated user's shopping cart with quantity of 1. If product already exists in cart, the quantity is incremented.",
  })
  @ApiBody({
    type: AddCartDto,
    description: "Product ID to add to cart",
  })
  @ApiResponse({
    status: 201,
    description: "Product added to cart successfully",
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - user not authenticated",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Product not found",
    type: ErrorResponseDto,
  })
  @Post()
  @Roles([Role.User])
  public async addToCart(
    @CurrentUser() user: User,
    @Body() addCart: AddCartDto,
  ): Promise<IResponse<CartItemDto>> {
    const response = await this.cartService.addToCart(user.id, addCart);
    return {
      message: "Product added to cart successfully",
      data: response,
    };
  }

  @ApiOperation({
    summary: "Update cart item quantity",
    description:
      "Updates the quantity of a specific cart item. User can only update their own cart items. Returns updated cart with total count and price.",
  })
  @ApiParam({
    name: "id",
    description: "Cart item ID (UUID)",
    type: String,
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiBody({
    type: AddQuantityDto,
    description: "New quantity for the cart item (must be positive integer)",
  })
  @ApiResponse({
    status: 200,
    description:
      "Quantity updated successfully. Returns complete cart with updated totals.",
    type: GetCartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - user not authenticated",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - user attempting to update another user's cart item",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Cart item not found",
    type: ErrorResponseDto,
  })
  @Patch(":id")
  @Roles([Role.User])
  public async addQuantity(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() addQuantity: AddQuantityDto,
  ): Promise<IResponse<CartDataDto>> {
    const response = await this.cartService.addQuantity(
      id,
      user.id,
      addQuantity,
    );
    return {
      message: "Product quantity added successfully",
      data: response,
    };
  }

  @ApiOperation({
    summary: "Remove all items from cart",
    description:
      "Removes all cart items for the authenticated user. This action cannot be undone.",
  })
  @ApiResponse({
    status: 200,
    description: "All cart items removed successfully",
    type: DeleteCartResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - user not authenticated",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    type: ErrorResponseDto,
  })
  @Delete("all-cart")
  @Roles([Role.User])
  public async removeAllFromCart(
    @CurrentUser() user: User,
  ): Promise<IResponse<DeleteResult>> {
    const response = await this.cartService.removeAllFromCart(user.id);
    return {
      message: "All Products removed from cart successfully",
      data: response,
    };
  }

  @ApiOperation({
    summary: "Bulk add products to cart",
    description:
      "Adds multiple products to the authenticated user's shopping cart with specified quantities. If a product already exists in cart, the quantity is incremented. Invalid or non-existent products are skipped and reported in the response.",
  })
  @ApiBody({
    type: BulkAddCartDto,
    description:
      "Array of products with quantities to add to cart. At least one item is required.",
  })
  @ApiResponse({
    status: 201,
    description:
      "Products processed successfully. Returns added items and any skipped items.",
    type: BulkAddCartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - validation failed (empty array, invalid quantities, etc.)",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - user not authenticated",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    type: ErrorResponseDto,
  })
  @Post("bulk")
  @Roles([Role.User])
  public async bulkAddToCart(
    @CurrentUser() user: User,
    @Body() bulkAddCart: BulkAddCartDto,
  ): Promise<IResponse<{ addedItems: CartItemDto[]; skippedItems: string[] }>> {
    const response = await this.cartService.bulkAddToCart(user.id, bulkAddCart);

    let message = `Successfully added ${response.addedItems.length} item(s) to cart`;
    if (response.skippedItems.length > 0) {
      message += `. ${response.skippedItems.length} item(s) were skipped (not found or invalid)`;
    }

    return {
      message,
      data: response,
    };
  }
}
