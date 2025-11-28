import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { CookieAuthGuard } from "../../authentication/guards/cookie-auth.guard";
import { Roles } from "../../authentication/guards/roles/roles.decorator";
import { Role } from "../../enum/role.enum";
import { BatchesService } from "./batches.service";
import { IResponse } from "../../interfaces/general";
import { CreateBatchDto } from "../../dto/createBatch.dto";
import { Batch } from "../../entities/Batch.entity";

@ApiTags("Batches")
@Controller("products/batches")
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @UseGuards(CookieAuthGuard)
  @Roles([Role.Admin])
  @Post("")
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
    const batch = await this.batchesService.createBatch(batchInfo);

    return {
      message: "Batch created successfully",
      data: batch,
    };
  }

  @Get("")
  @ApiOperation({
    summary: "Get all batches",
    description: "Retrieve all product batches",
  })
  @ApiResponse({
    status: 200,
    description: "Batches retrieved successfully",
  })
  public async getAllBatches(): Promise<IResponse<Batch[]>> {
    const batches = await this.batchesService.getAllBatches();

    return {
      message: "Batches loaded successfully",
      data: batches,
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
  })
  @ApiResponse({ status: 404, description: "Batch not found" })
  public async getBatch(@Param("id") id: string): Promise<IResponse<Batch>> {
    const batch = await this.batchesService.getBatch(id);

    return {
      message: "Batch loaded successfully",
      data: batch,
    };
  }
}
