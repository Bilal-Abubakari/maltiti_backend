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
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../authentication/guards/jwt-auth.guard";
import { ProductsService } from "./products.service";
import { IPaginatedResponse, IResponse } from "../interfaces/general";
import { CreateProductDto } from "../dto/createProduct.dto";
import { UpdateProductDto } from "../dto/updateProduct.dto";
import { ProductQueryDto } from "../dto/productQuery.dto";
import { CreateBatchDto } from "../dto/createBatch.dto";
import {
  ProductResponseDto,
  ProductsPaginationResponseDto,
  BestProductsResponseDto,
} from "../dto/productResponse.dto";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";

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
    type: ProductsPaginationResponseDto,
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

  @Get("best-products")
  @ApiOperation({
    summary: "Get featured products",
    description: "Retrieve 8 random featured/best products",
  })
  @ApiResponse({
    status: 200,
    description: "Featured products retrieved successfully",
    type: BestProductsResponseDto,
  })
  public async getBestProducts(): Promise<IResponse<BestProductsResponseDto>> {
    const products = await this.productsService.getBestProducts();

    return {
      message: "Featured products loaded successfully",
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
    type: ProductResponseDto,
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

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
  @Post("add-product")
  @ApiBearerAuth()
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

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
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

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
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
  public async deleteProduct(
    @Param("id") id: string,
  ): Promise<IResponse<{ deleted: boolean; id: string }>> {
    const deleteResult = await this.productsService.deleteProduct(id);

    return {
      message: "Product deleted successfully",
      data: deleteResult,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
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

  @UseGuards(JwtAuthGuard)
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

  // Batch Management Endpoints

  @UseGuards(JwtAuthGuard)
  @Roles([Role.Admin])
  @Post("batches")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create new batch",
    description: "Create a new product batch (Admin only)",
  })
  @ApiResponse({
    status: 201,
    description: "Batch created successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 409, description: "Batch number already exists" })
  @HttpCode(HttpStatus.CREATED)
  public async createBatch(
    @Body() batchInfo: CreateBatchDto,
  ): Promise<IResponse<Batch>> {
    const batch = await this.productsService.createBatch(batchInfo);

    return {
      message: "Batch created successfully",
      data: batch,
    };
  }

  @Get("batches")
  @ApiOperation({
    summary: "Get all batches",
    description: "Retrieve all product batches",
  })
  @ApiResponse({
    status: 200,
    description: "Batches retrieved successfully",
  })
  public async getAllBatches(): Promise<IResponse<Batch[]>> {
    const batches = await this.productsService.getAllBatches();

    return {
      message: "Batches loaded successfully",
      data: batches,
    };
  }

  @Get("batches/:id")
  @ApiOperation({
    summary: "Get single batch",
    description: "Retrieve a single batch by ID with all associated products",
  })
  @ApiParam({
    name: "id",
    description: "Batch UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Batch retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Batch not found" })
  public async getBatch(@Param("id") id: string): Promise<IResponse<Batch>> {
    const batch = await this.productsService.getBatch(id);

    return {
      message: "Batch loaded successfully",
      data: batch,
    };
  }
}
