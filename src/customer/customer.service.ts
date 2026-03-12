import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "../entities/Customer.entity";
import { DeleteResult, Repository } from "typeorm";
import { CreateCustomerDto } from "../dto/createCustomer.dto";
import { UpdateCustomerDto } from "../dto/updateCustomer.dto";
import { IPagination } from "../interfaces/general";
import { User } from "../entities/User.entity";
import { CustomerQueryDto } from "../dto/customerQuery.dto";

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
    queryDto: CustomerQueryDto,
  ): Promise<IPagination<Customer>> {
    const {
      page = 1,
      limit = 20,
      search,
      email,
      phone,
      country,
      region,
      city,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = queryDto;

    const queryBuilder = this.customerRepository.createQueryBuilder("customer");

    if (search) {
      queryBuilder.andWhere(
        "(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search OR customer.phoneNumber ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (email) {
      queryBuilder.andWhere("customer.email = :email", { email });
    }

    if (phone) {
      queryBuilder.andWhere(
        "(customer.phone = :phone OR customer.phoneNumber = :phone)",
        { phone },
      );
    }

    if (country) {
      queryBuilder.andWhere("customer.country ILIKE :country", {
        country: `%${country}%`,
      });
    }

    if (region) {
      queryBuilder.andWhere("customer.region ILIKE :region", {
        region: `%${region}%`,
      });
    }

    if (city) {
      queryBuilder.andWhere("customer.city ILIKE :city", { city: `%${city}%` });
    }

    if (startDate) {
      queryBuilder.andWhere("customer.createdAt >= :startDate", { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere("customer.createdAt <= :endDate", { endDate });
    }

    queryBuilder
      .orderBy(`customer.${sortBy}`, sortOrder as "ASC" | "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [customers, totalItems] = await queryBuilder.getManyAndCount();

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
      "",
      customerInfo.email ?? "",
    );

    // Check if email is being updated and already exists
    if (existingCustomer && existingCustomer.id !== customer.id) {
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

  public async findCustomerByUser(user: User): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { user: { id: user.id } },
      relations: ["user"],
    });
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
    if (customerInfo.phoneNumber !== undefined) {
      customer.phoneNumber = customerInfo.phoneNumber;
    }
    if (customerInfo.email !== undefined) {
      customer.email = customerInfo.email;
    }
    if (customerInfo.address !== undefined) {
      customer.address = customerInfo.address;
    }
    if (customerInfo.country !== undefined) {
      customer.country = customerInfo.country;
    }
    if (customerInfo.region !== undefined) {
      customer.region = customerInfo.region;
    }
    if (customerInfo.city !== undefined) {
      customer.city = customerInfo.city;
    }
    if (customerInfo.extraInfo !== undefined) {
      customer.extraInfo = customerInfo.extraInfo;
    }
  }
}
