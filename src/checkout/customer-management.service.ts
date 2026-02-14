import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryRunner, Repository } from "typeorm";
import { Customer } from "../entities/Customer.entity";
import { User } from "../entities/User.entity";
import {
  InitializeTransaction,
  PlaceOrderDto,
  GuestInitializeTransactionDto,
  GuestPlaceOrderDto,
} from "../dto/checkout.dto";
@Injectable()
export class CustomerManagementService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}
  public async findOrCreateCustomer(
    user: User,
    data: InitializeTransaction | PlaceOrderDto,
    queryRunner: QueryRunner,
  ): Promise<Customer> {
    let customer = await queryRunner.manager.findOne(Customer, {
      where: { user: { id: user.id } },
      relations: ["user"],
    });
    if (!customer) {
      // Check if a customer with the same email exists and is not linked to a user
      customer = await queryRunner.manager.findOne(Customer, {
        where: { email: user.email },
      });
      if (customer && !customer.user) {
        // Link the existing customer to the user
        customer.user = user;
      } else if (!customer) {
        // Create new customer
        customer = new Customer();
        customer.user = user;
        customer.name = user.name;
        customer.email = user.email;
        customer.phone = user.phoneNumber;
      }
    }
    this.updateCustomerDetails(customer, data);
    customer = await queryRunner.manager.save(customer);
    return customer;
  }
  public async findOrCreateGuestCustomer(
    data: GuestInitializeTransactionDto | GuestPlaceOrderDto,
    queryRunner: QueryRunner,
  ): Promise<Customer> {
    // Try to find existing customer by email
    let customer = await queryRunner.manager.findOne(Customer, {
      where: { email: data.email },
    });
    if (!customer) {
      customer = new Customer();
      customer.user = null;
      customer.name = data.name;
      customer.email = data.email;
      customer.phone = data.phoneNumber;
    }
    this.updateCustomerDetails(customer, data);
    customer = await queryRunner.manager.save(customer);
    return customer;
  }

  private updateCustomerDetails(
    customer: Customer,
    data:
      | InitializeTransaction
      | PlaceOrderDto
      | GuestInitializeTransactionDto
      | GuestPlaceOrderDto,
  ): void {
    customer.country = data.country;
    customer.region = data.region;
    customer.city = data.city;
    customer.phoneNumber = data.phoneNumber;
    customer.extraInfo = data.extraInfo || null;
    customer.address = `${data.country}, ${data.region}, ${data.city}${data.extraInfo ? ", " + data.extraInfo : ""}`;
  }
}
