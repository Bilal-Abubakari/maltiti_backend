import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeleteResult, IsNull, Repository } from "typeorm";
import { Cart } from "../entities/Cart.entity";
import { UsersService } from "../users/users.service";
import { ProductsService } from "../products/products.service";
import { AddCartDto, AddQuantityDto, BulkAddCartDto } from "../dto/addCart.dto";
import { User } from "../entities/User.entity";
import { Product } from "../entities/Product.entity";
import {
  CartDataDto,
  CartItemDto,
  CartProductDto,
} from "../dto/cartResponse.dto";

@Injectable()
export class CartService {
  constructor(
    private readonly userService: UsersService,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * Transform Cart entity to CartItemDto
   */
  private transformCartToDto(cart: Cart): CartItemDto {
    const product: CartProductDto = {
      id: cart.product.id,
      sku: cart.product.sku,
      name: cart.product.name,
      category: cart.product.category,
      description: cart.product.description,
      status: cart.product.status,
      images: cart.product.images,
      image: cart.product.image,
      wholesale: cart.product.wholesale,
      retail: cart.product.retail,
      inBoxPrice: cart.product.inBoxPrice,
      quantityInBox: cart.product.quantityInBox,
      favorite: cart.product.favorite,
      rating: cart.product.rating,
      reviews: cart.product.reviews,
      weight: cart.product.weight,
    };

    return {
      id: cart.id,
      userId: cart.user ? cart.user.id : null,
      product,
      quantity: cart.quantity,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  public async getCustomerCart(id: string): Promise<CartDataDto> {
    const user = await this.userService.findOne(id);
    const cartAndCount = await this.cartRepository.findAndCountBy({
      user: { id: user.id },
      checkout: IsNull(),
    });
    console.log("cartAndCount", cartAndCount);
    let total = 0;
    cartAndCount[0].forEach(
      cart => (total += cart.quantity * cart.product.retail),
    );

    const cartItems = cartAndCount[0].map(cart =>
      this.transformCartToDto(cart),
    );

    return {
      items: cartItems,
      count: cartAndCount[1],
      total,
    };
  }

  public async removeFromCart(
    cartId: string,
    userId: string,
  ): Promise<DeleteResult> {
    const user = await this.userService.findOne(userId);

    // Verify the cart item exists and belongs to the user
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ["user"],
    });

    if (!cartItem) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Cart item not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const cartUser = cartItem.user;
    if (cartUser.id !== user.id) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: "You are not authorized to delete this cart item",
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return await this.cartRepository.delete(cartId);
  }

  public async removeAllFromCart(id: string): Promise<DeleteResult> {
    const user = await this.userService.findOne(id);
    return await this.cartRepository.delete({ user });
  }

  public async addToCart(
    id: string,
    addCart: AddCartDto,
  ): Promise<CartItemDto> {
    const { user, product, existingCart } = await this.findCart(id, addCart.id);

    console.log("existingCart", existingCart);

    if (existingCart) {
      existingCart.quantity += addCart.quantity || 1;
      const updatedCart = await this.cartRepository.save(existingCart);
      return this.transformCartToDto(updatedCart);
    }

    const cart = new Cart();
    cart.user = user;
    cart.product = product;
    cart.quantity = addCart.quantity || 1;

    const savedCart = await this.cartRepository.save(cart);
    console.log("savedCart", savedCart);
    return this.transformCartToDto(savedCart);
  }

  public async addQuantity(
    cartId: string,
    userId: string,
    addQuantity: AddQuantityDto,
  ): Promise<CartDataDto> {
    const user = await this.userService.findOne(userId);

    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ["user"],
    });

    if (!cart) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Cart item not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const cartUser = cart.user;
    if (cartUser.id !== user.id) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: "You are not authorized to update this cart item",
        },
        HttpStatus.FORBIDDEN,
      );
    }

    cart.quantity = addQuantity.quantity;
    await this.cartRepository.save(cart);
    return await this.getCustomerCart(user.id);
  }

  public async findCart(
    id: string,
    productId: string,
  ): Promise<{ user: User; product: Product; existingCart: Cart }> {
    const user = await this.userService.findOne(id);
    const product = await this.productsService.findOne(productId);

    const existingCart = await this.cartRepository.findOne({
      where: {
        product: { id: productId },
        user: { id: id },
        checkout: IsNull(),
      },
    });

    return { user, product, existingCart };
  }

  public async bulkAddToCart(
    userId: string,
    bulkAddCart: BulkAddCartDto,
  ): Promise<{ addedItems: CartItemDto[]; skippedItems: string[] }> {
    const user = await this.userService.findOne(userId);
    const addedItems: CartItemDto[] = [];
    const skippedItems: string[] = [];

    for (const item of bulkAddCart.items) {
      try {
        // Check if product exists
        const product = await this.productsService.findOne(item.productId);

        // Check if item already exists in cart
        const existingCart = await this.cartRepository.findOne({
          where: {
            product: { id: item.productId },
            user: { id: userId },
            checkout: IsNull(),
          },
        });

        if (existingCart) {
          // Update quantity if item already exists
          existingCart.quantity += item.quantity;
          const updatedCart = await this.cartRepository.save(existingCart);
          addedItems.push(this.transformCartToDto(updatedCart));
        } else {
          // Create new cart item
          const cart = new Cart();
          cart.user = user;
          cart.product = product;
          cart.quantity = item.quantity;
          const savedCart = await this.cartRepository.save(cart);
          addedItems.push(this.transformCartToDto(savedCart));
        }
      } catch (error) {
        // If product not found or any other error, skip this item
        skippedItems.push(item.productId);
      }
    }

    return { addedItems, skippedItems };
  }

  // Guest cart methods
  public async getGuestCart(sessionId: string): Promise<CartDataDto> {
    const cartAndCount = await this.cartRepository.findAndCountBy({
      sessionId: sessionId,
      checkout: IsNull(),
    });
    let total = 0;
    cartAndCount[0].forEach(
      cart => (total += cart.quantity * cart.product.retail),
    );

    const cartItems = cartAndCount[0].map(cart =>
      this.transformCartToDto(cart),
    );

    return {
      items: cartItems,
      count: cartAndCount[1],
      total,
    };
  }

  public async addToGuestCart(
    sessionId: string,
    addCart: AddCartDto,
  ): Promise<CartItemDto> {
    const product = await this.productsService.findOne(addCart.id);

    const existingCart = await this.cartRepository.findOne({
      where: {
        product: { id: addCart.id },
        sessionId: sessionId,
        checkout: IsNull(),
      },
    });

    if (existingCart) {
      existingCart.quantity += addCart.quantity || 1;
      const updatedCart = await this.cartRepository.save(existingCart);
      return this.transformCartToDto(updatedCart);
    }

    const cart = new Cart();
    cart.user = null;
    cart.sessionId = sessionId;
    cart.product = product;
    cart.quantity = addCart.quantity || 1;

    const savedCart = await this.cartRepository.save(cart);
    return this.transformCartToDto(savedCart);
  }

  public async removeFromGuestCart(
    cartId: string,
    sessionId: string,
  ): Promise<DeleteResult> {
    // Verify the cart item exists and belongs to the session
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartId, sessionId: sessionId },
    });

    if (!cartItem) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Cart item not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return await this.cartRepository.delete(cartId);
  }

  public async removeAllFromGuestCart(
    sessionId: string,
  ): Promise<DeleteResult> {
    return await this.cartRepository.delete({ sessionId });
  }

  public async updateGuestCartQuantity(
    cartId: string,
    sessionId: string,
    addQuantity: AddQuantityDto,
  ): Promise<CartDataDto> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId, sessionId: sessionId },
    });

    if (!cart) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Cart item not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }

    cart.quantity = addQuantity.quantity;
    await this.cartRepository.save(cart);
    return await this.getGuestCart(sessionId);
  }

  public async bulkAddToGuestCart(
    sessionId: string,
    bulkAddCart: BulkAddCartDto,
  ): Promise<{ addedItems: CartItemDto[]; skippedItems: string[] }> {
    const addedItems: CartItemDto[] = [];
    const skippedItems: string[] = [];

    for (const item of bulkAddCart.items) {
      try {
        // Check if product exists
        const product = await this.productsService.findOne(item.productId);

        // Check if item already exists in cart
        const existingCart = await this.cartRepository.findOne({
          where: {
            product: { id: item.productId },
            sessionId: sessionId,
            checkout: IsNull(),
          },
        });

        if (existingCart) {
          // Update quantity if item already exists
          existingCart.quantity += item.quantity;
          const updatedCart = await this.cartRepository.save(existingCart);
          addedItems.push(this.transformCartToDto(updatedCart));
        } else {
          // Create new cart item
          const cart = new Cart();
          cart.user = null;
          cart.sessionId = sessionId;
          cart.product = product;
          cart.quantity = item.quantity;
          const savedCart = await this.cartRepository.save(cart);
          addedItems.push(this.transformCartToDto(savedCart));
        }
      } catch (error) {
        // If product not found or any other error, skip this item
        skippedItems.push(item.productId);
      }
    }

    return { addedItems, skippedItems };
  }

  /**
   * Sync guest cart with user cart after login/signup
   * Merges guest cart items into user's cart
   */
  public async syncGuestCartWithUser(
    userId: string,
    sessionId: string,
  ): Promise<{ syncedCount: number; skippedCount: number }> {
    const user = await this.userService.findOne(userId);

    // Get all guest cart items for this session
    const guestCartItems = await this.cartRepository.findBy({
      sessionId: sessionId,
      checkout: IsNull(),
    });

    if (!guestCartItems || guestCartItems.length === 0) {
      return { syncedCount: 0, skippedCount: 0 };
    }

    let syncedCount = 0;
    let skippedCount = 0;

    for (const guestItem of guestCartItems) {
      try {
        // Check if user already has this product in their cart
        const existingUserCart = await this.cartRepository.findOne({
          where: {
            product: { id: guestItem.product.id },
            user: { id: userId },
            checkout: IsNull(),
          },
        });

        if (existingUserCart) {
          // Merge quantities
          existingUserCart.quantity += guestItem.quantity;
          await this.cartRepository.save(existingUserCart);
          syncedCount++;
        } else {
          // Transfer guest cart item to user
          guestItem.user = user;
          guestItem.sessionId = null;
          await this.cartRepository.save(guestItem);
          syncedCount++;
        }
      } catch (error) {
        // If any error occurs, skip this item
        skippedCount++;
      }
    }

    // Delete any remaining guest cart items for this session
    await this.cartRepository.delete({
      sessionId: sessionId,
      checkout: IsNull(),
    });

    return { syncedCount, skippedCount };
  }
}
