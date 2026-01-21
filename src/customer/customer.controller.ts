import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { IResponse, IPaginatedResponse } from "../interfaces/general";
import { CreateCustomerDto } from "../dto/createCustomer.dto";
import { UpdateCustomerDto } from "../dto/updateCustomer.dto";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { Customer } from "../entities/Customer.entity";
import { DeleteResult } from "typeorm";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";
import { CustomerResponseDto } from "../dto/customerResponse.dto";
import { CurrentUser } from "../authentication/decorators/current-user.decorator";
import { User } from "../entities/User.entity";
import { CustomerMeResponseDto } from "../dto/customerMeResponse.dto";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";

@UseGuards(CookieAuthGuard)
@ApiTags("customers")
@Controller("customers")
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: "Get all customers with pagination" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiResponse({ status: 200, description: "Customers retrieved successfully" })
  public async getAllCustomers(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
  ): Promise<IPaginatedResponse<Customer>> {
    const customers = await this.customerService.getAllCustomers(page, limit);

    return {
      message: "Customers loaded successfully",
      data: customers,
    };
  }

  @Get("me")
  @Roles([Role.User])
  @ApiOperation({
    summary: "Get the customer information for the logged-in user",
  })
  @ApiResponse({
    status: 200,
    description: "Customer information retrieved successfully",
    type: CustomerMeResponseDto,
  })
  @ApiResponse({ status: 404, description: "Customer not found for the user" })
  public async getMyCustomer(
    @CurrentUser() user: User,
  ): Promise<IResponse<CustomerResponseDto>> {
    const customer = await this.customerService.findCustomerByUser(user);

    if (!customer) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Customer not found for the user",
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      message: "Customer information loaded successfully",
      data: customer as CustomerResponseDto,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a customer by ID" })
  @ApiParam({ name: "id", type: String, description: "Customer ID" })
  @ApiResponse({ status: 200, description: "Customer retrieved successfully" })
  @ApiResponse({ status: 404, description: "Customer not found" })
  public async getCustomer(
    @Param("id") id: string,
  ): Promise<IResponse<Customer>> {
    const customer = await this.customerService.findOneCustomer(id);

    return {
      message: "Customer loaded successfully",
      data: customer,
    };
  }

  @Post()
  @ApiOperation({ summary: "Create a new customer" })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, description: "Customer created successfully" })
  @ApiResponse({
    status: 409,
    description: "Customer with email already exists",
  })
  public async createCustomer(
    @Body() customerInfo: CreateCustomerDto,
  ): Promise<IResponse<Customer>> {
    const customer = await this.customerService.createCustomer(customerInfo);

    return {
      message: "Customer created successfully",
      data: customer,
    };
  }

  @Patch()
  @ApiOperation({ summary: "Update an existing customer" })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 200, description: "Customer updated successfully" })
  @ApiResponse({ status: 404, description: "Customer not found" })
  @ApiResponse({
    status: 409,
    description: "Customer with email already exists",
  })
  public async updateCustomer(
    @Body() customerInfo: UpdateCustomerDto,
  ): Promise<IResponse<Customer>> {
    const customer = await this.customerService.updateCustomer(customerInfo);

    return {
      message: "Customer updated successfully",
      data: customer,
    };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a customer (soft delete)" })
  @ApiParam({ name: "id", type: String, description: "Customer ID" })
  @ApiResponse({ status: 200, description: "Customer deleted successfully" })
  @ApiResponse({ status: 404, description: "Customer not found" })
  public async deleteCustomer(
    @Param("id") id: string,
  ): Promise<IResponse<DeleteResult>> {
    const deleteResult = await this.customerService.deleteCustomer(id);

    return {
      message: "Customer deleted successfully",
      data: deleteResult,
    };
  }
}
