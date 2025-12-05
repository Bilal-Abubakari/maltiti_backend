import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "../entities/Customer.entity";
import { DeleteResult, Repository } from "typeorm";
import { CreateCustomerDto } from "../dto/createCustomer.dto";
import { UpdateCustomerDto } from "../dto/updateCustomer.dto";
import { IPagination } from "../interfaces/general";

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  public async createCustomer(
    customerInfo: CreateCustomerDto,
  ): Promise<Customer> {
    const customer = new Customer();
    const existingCustomer = await this.findCustomerByEmailOrPhone(
      customerInfo.phone ?? "",
      customerInfo.email ?? "",
    );
    if (existingCustomer) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "Customer with email or phone already exists",
        },
        HttpStatus.CONFLICT,
      );
    }

    this.setCustomer(customer, customerInfo);

    return this.customerRepository.save(customer);
  }

  public async getAllCustomers(
    page: number = 1,
    limit: number = 10,
  ): Promise<IPagination<Customer>> {
    const [customers, totalItems] = await this.customerRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" },
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      totalItems,
      currentPage: page,
      totalPages,
      items: customers,
    };
  }

  public async findOneCustomer(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ["sales", "user"],
    });

    if (!customer) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Customer not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return customer;
  }

  public async updateCustomer(
    customerInfo: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.findOneCustomer(customerInfo.id);
    const existingCustomer = await this.findCustomerByEmailOrPhone(
      customerInfo.phone ?? "",
      customerInfo.email ?? "",
    );

    // Check if email is being updated and already exists
    if (existingCustomer) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "Customer with email or phone already exists",
        },
        HttpStatus.CONFLICT,
      );
    }

    this.setCustomer(customer, customerInfo);

    return this.customerRepository.save(customer);
  }

  public async deleteCustomer(id: string): Promise<DeleteResult> {
    const customer = await this.findOneCustomer(id);

    // Soft delete by setting deletedAt
    customer.deletedAt = new Date();

    await this.customerRepository.save(customer);

    return { affected: 1, raw: [] };
  }

  private async findCustomerByEmailOrPhone(
    phone: string,
    email: string,
  ): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: [{ phone }, { email }] });
  }

  private setCustomer(
    customer: Customer,
    customerInfo: CreateCustomerDto | UpdateCustomerDto,
  ): void {
    if (customerInfo.name !== undefined) {
      customer.name = customerInfo.name;
    }
    if (customerInfo.phone !== undefined) {
      customer.phone = customerInfo.phone;
    }
    if (customerInfo.email !== undefined) {
      customer.email = customerInfo.email;
    }
    if (customerInfo.address !== undefined) {
      customer.address = customerInfo.address;
    }
  }
}
