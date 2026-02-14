import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CookieAuthGuard } from "../../authentication/guards/cookie-auth.guard";
import { Roles } from "../../authentication/guards/roles/roles.decorator";
import { Role } from "../../enum/role.enum";
import { BatchesService } from "./batches.service";
import { IPaginatedResponse, IResponse } from "../../interfaces/general";
import { CreateBatchDto } from "../../dto/createBatch.dto";
import { BatchQueryDto } from "../../dto/batchQuery.dto";
import { BatchResponseDto } from "../../dto/batchResponse.dto";
import { Batch } from "../../entities/Batch.entity";

@ApiTags("Batches")
@Controller("products/batches")
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @UseGuards(CookieAuthGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @Post("")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create new batch",
    description: "Create a new product batch (Admin only)",
  })
  @ApiResponse({
    status: 201,
    description: "Batch created successfully",
    type: BatchResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 409, description: "Batch number already exists" })
  @HttpCode(HttpStatus.CREATED)
  public async createBatch(
    @Body() batchInfo: CreateBatchDto,
  ): Promise<IResponse<Batch>> {
    const batch = await this.batchesService.createBatch(batchInfo);

    return {
      message: "Batch created successfully",
      data: batch,
    };
  }

  @Get("")
  @ApiOperation({
    summary: "Get all batches",
    description: "Retrieve all product batches with pagination and filters",
  })
  @ApiQuery({ type: BatchQueryDto })
  @ApiResponse({
    status: 200,
    description: "Batches retrieved successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            batches: {
              type: "array",
              items: { $ref: "#/components/schemas/BatchResponseDto" },
            },
            total: { type: "number" },
            page: { type: "number" },
            limit: { type: "number" },
          },
        },
      },
    },
  })
  public async getAllBatches(
    @Query() query: BatchQueryDto,
  ): Promise<IPaginatedResponse<Batch>> {
    const result = await this.batchesService.getAllBatches(query);

    return {
      message: "Batches loaded successfully",
      data: result,
    };
  }

  @Get(":id")
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
    type: BatchResponseDto,
  })
  @ApiResponse({ status: 404, description: "Batch not found" })
  public async getBatch(@Param("id") id: string): Promise<IResponse<Batch>> {
    const batch = await this.batchesService.getBatch(id);

    return {
      message: "Batch loaded successfully",
      data: batch,
    };
  }

  @Get("product/:productId")
  @ApiOperation({
    summary: "Get batches for a product",
    description: "Retrieve all batches associated with a specific product",
  })
  @ApiParam({
    name: "productId",
    description: "Product UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Batches retrieved successfully",
    type: [BatchResponseDto],
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  public async getBatchesByProduct(
    @Param("productId") productId: string,
  ): Promise<IResponse<Batch[]>> {
    const batches = await this.batchesService.getBatchesByProduct(productId);

    return {
      message: "Batches for product loaded successfully",
      data: batches,
    };
  }
}
