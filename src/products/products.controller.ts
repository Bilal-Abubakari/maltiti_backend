import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../authentication/guards/jwt-auth.guard";
import { ProductsService } from "./products.service";
import {
  IBestProducts,
  IResponse,
  product,
  productsPagination,
} from "../interfaces/general";
import { AddProductDto } from "../dto/addProduct.dto";
import { Product } from "../entities/Product.entity";
import { DeleteResult } from "typeorm";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";

@Controller("products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get("all-products")
  public async getAllProducts(
    @Query("page") page: number,
    @Query("searchTerm") searchTerm: string,
    @Query("category") category: string,
  ): Promise<IResponse<productsPagination>> {
    const products = await this.productsService.getAllProducts(
      page,
      10,
      searchTerm,
      category,
    );

    return {
      message: "Products loaded successfully",
      data: products,
    };
  }

  @Get("best-products")
  public async getBestProducts(): Promise<IResponse<IBestProducts>> {
    const products = await this.productsService.getBestProducts();

    return {
      message: "Products loaded successfully",
      data: products,
    };
  }

  @Get("product/:id")
  public async getProduct(
    @Param("id") id: string,
  ): Promise<IResponse<Product>> {
    const product = await this.productsService.getOneProducts(id);

    return {
      message: "Product loaded successfully",
      data: product,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
  @Post("add-product")
  public async addProduct(
    @Body() productInfo: AddProductDto,
  ): Promise<IResponse<Product>> {
    const product = await this.productsService.createProduct(productInfo);

    return {
      message: "Product created successfully",
      data: product,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
  @Put("edit-product/:id")
  public async editProduct(
    @Param("id") id: string,
    @Body() productInfo: AddProductDto,
  ): Promise<IResponse<product>> {
    const product = await this.productsService.editProduct(id, productInfo);
    const customizedProduct = {
      ...product,
      ingredients: product.ingredients.split(","),
    };

    return {
      message: "Product edited successfully",
      data: customizedProduct,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
  @Delete("delete-product/:id")
  public async deleteProduct(
    @Param("id") id: string,
  ): Promise<IResponse<DeleteResult>> {
    const deleteResult = await this.productsService.deleteProduct(id);

    return {
      message: "Product deleted successfully",
      data: deleteResult,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
  @Patch("change-status/:id")
  public async changeProductStatus(
    @Param("id") id: string,
  ): Promise<IResponse<product>> {
    const product = await this.productsService.changeProductStatus(id);
    const customizedProduct = {
      ...product,
      ingredients: product.ingredients.split(","),
    };

    return {
      message: "Product status changed successfully",
      data: customizedProduct,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
  @Roles([Role.User])
  @Patch("favorite/:id")
  public async favorite(@Param("id") id: string): Promise<IResponse<product>> {
    const product = await this.productsService.favorite(id);
    const customizedProduct = {
      ...product,
      ingredients: product.ingredients.split(","),
    };

    return {
      message: customizedProduct.favorite
        ? "Product marked as favorite successfully"
        : "Product unmarked successfully",
      data: customizedProduct,
    };
  }
}
