import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { OptionalAuthGuard } from "../authentication/guards/optional-auth.guard";
import { CurrentUser } from "../authentication/decorators/current-user.decorator";
import { ProductsService } from "./products.service";
import { IPaginatedResponse, IResponse } from "../interfaces/general";
import { CreateProductDto } from "../dto/createProduct.dto";
import { UpdateProductDto } from "../dto/updateProduct.dto";
import {
  ExportProductQueryDto,
  ProductQueryDto,
} from "../dto/productQuery.dto";
import {
  BestProductsResponseDto,
  BestProductsApiResponseDto,
  ProductResponseDto,
  ProductPaginationApiResponseDto,
  SingleProductResponseDto,
} from "../dto/productResponse.dto";
import { Product } from "../entities/Product.entity";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";
import { Response } from "express";
import { NotFoundException } from "@nestjs/common/exceptions";
import { LightProduct } from "../interfaces/product-light.model";
import { AuditLog } from "../interceptors/audit.interceptor";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { User } from "../entities/User.entity";

@ApiTags("Products")
@Controller("products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get("all-products")
  @ApiOperation({
    summary: "Get all products",
    description:
      "Retrieve all products with flexible filtering, pagination, and sorting options",
  })
  @ApiResponse({
    status: 200,
    description: "Products retrieved successfully",
    type: ProductPaginationApiResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid query parameters" })
  public async getAllProducts(
    @Query() queryDto: ProductQueryDto,
  ): Promise<IPaginatedResponse<Product>> {
    const products = await this.productsService.getAllProducts(queryDto);

    return {
      message: "Products loaded successfully",
      data: products,
    };
  }

  @UseGuards(OptionalAuthGuard)
  @Get("best-products")
  @ApiOperation({
    summary: "Get preview products for homepage",
    description:
      "Returns 8-10 highly relevant products for homepage display. " +
      "For authenticated users: personalized based on purchase history, cart activity, and preferences. " +
      "For anonymous users: curated based on best-sellers, trending items, and engagement metrics. " +
      "This endpoint is not paginated and is optimized for preview/featured sections.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Preview products retrieved successfully. Response includes personalized products for logged-in users or curated best performers for anonymous users.",
    type: BestProductsApiResponseDto,
  })
  public async getBestProducts(
    @CurrentUser() user?: User,
  ): Promise<IResponse<BestProductsResponseDto>> {
    const products = await this.productsService.getBestProducts(user);

    const message = user
      ? "Personalized products loaded successfully"
      : "Featured products loaded successfully";

    return {
      message,
      data: products,
    };
  }

  @Get("list")
  @ApiOperation({
    summary: "Get all products basic",
    description: "Retrieve all products with only id and name fields",
  })
  @ApiResponse({
    status: 200,
    description: "Products retrieved successfully",
  })
  public async getAllProductsBasic(): Promise<IResponse<LightProduct[]>> {
    const products = await this.productsService.getAllProductsBasic();

    return {
      message: "Products loaded successfully",
      data: products,
    };
  }

  @Get("product/:id")
  @ApiOperation({
    summary: "Get single product",
    description: "Retrieve a single product by ID",
  })
  @ApiParam({
    name: "id",
    description: "Product UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Product retrieved successfully",
    type: SingleProductResponseDto,
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  public async getProduct(
    @Param("id") id: string,
  ): Promise<IResponse<Product>> {
    const product = await this.productsService.getOneProduct(id);

    return {
      message: "Product loaded successfully",
      data: product,
    };
  }

  @UseGuards(CookieAuthGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @Post("add-product")
  @ApiOperation({
    summary: "Create new product",
    description: "Create a new product (Admin only)",
  })
  @ApiResponse({
    status: 201,
    description: "Product created successfully",
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 409, description: "Product with SKU already exists" })
  @HttpCode(HttpStatus.CREATED)
  public async addProduct(
    @Body() productInfo: CreateProductDto,
  ): Promise<IResponse<Product>> {
    const product = await this.productsService.createProduct(productInfo);

    return {
      message: "Product created successfully",
      data: product,
    };
  }

  @UseGuards(CookieAuthGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @Put("edit-product/:id")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update product",
    description: "Update an existing product (Admin only)",
  })
  @ApiParam({
    name: "id",
    description: "Product UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Product updated successfully",
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Product not found" })
  @ApiResponse({ status: 409, description: "Product with SKU already exists" })
  @AuditLog({
    actionType: AuditActionType.UPDATE,
    entityType: AuditEntityType.PRODUCT,
    description: "Updated product",
    getEntityId: result => result?.data?.id,
  })
  public async editProduct(
    @Param("id") id: string,
    @Body() productInfo: UpdateProductDto,
  ): Promise<IResponse<Product>> {
    const product = await this.productsService.editProduct(id, productInfo);

    return {
      message: "Product updated successfully",
      data: product,
    };
  }

  @UseGuards(CookieAuthGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @Delete("delete-product/:id")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete product",
    description: "Soft delete a product (Admin only)",
  })
  @ApiParam({
    name: "id",
    description: "Product UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Product deleted successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Product not found" })
  @AuditLog({
    actionType: AuditActionType.DELETE,
    entityType: AuditEntityType.PRODUCT,
    description: "Deleted product",
    getEntityId: result => result?.data?.id,
  })
  public async deleteProduct(
    @Param("id") id: string,
  ): Promise<IResponse<{ deleted: boolean; id: string }>> {
    const deleteResult = await this.productsService.deleteProduct(id);

    return {
      message: "Product deleted successfully",
      data: deleteResult,
    };
  }

  @UseGuards(CookieAuthGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @Patch("change-status/:id")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Toggle product status",
    description:
      "Toggle product status between active and inactive (Admin only)",
  })
  @ApiParam({
    name: "id",
    description: "Product UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Product status changed successfully",
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Product not found" })
  public async changeProductStatus(
    @Param("id") id: string,
  ): Promise<IResponse<Product>> {
    const product = await this.productsService.changeProductStatus(id);

    return {
      message: "Product status changed successfully",
      data: product,
    };
  }

  @UseGuards(CookieAuthGuard)
  @Roles([Role.Admin, Role.User])
  @Patch("favorite/:id")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Toggle product favorite",
    description: "Toggle product favorite status",
  })
  @ApiParam({
    name: "id",
    description: "Product UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Product favorite status toggled successfully",
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Product not found" })
  public async toggleFavorite(
    @Param("id") id: string,
  ): Promise<IResponse<Product>> {
    const product = await this.productsService.toggleFavorite(id);

    return {
      message: product.favorite
        ? "Product marked as favorite successfully"
        : "Product unmarked from favorites successfully",
      data: product,
    };
  }

  @UseGuards(CookieAuthGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @Get("export/excel")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Export all products to Excel",
    description:
      "Export all products to a well-structured Excel file with optional filtering. Supports category, status, grade, and other filters.",
  })
  @ApiResponse({
    status: 200,
    description: "Excel file downloaded successfully",
    content: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        schema: { type: "string", format: "binary" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 404,
    description: "No products found matching filters",
  })
  public async exportProductsToExcel(
    @Query() queryDto: ExportProductQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Generate Excel buffer
      const excelBuffer =
        await this.productsService.exportProductsToExcel(queryDto);

      // Set response headers for file download
      const filename = `products-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      // Send the Excel file
      res.send(excelBuffer);
    } catch (error) {
      // Handle errors gracefully
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error("Export error:", error);
        res
          .status(500)
          .json({ message: "Internal server error during export" });
      }
    }
  }
}
