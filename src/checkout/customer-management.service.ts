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
      customer = new Customer();
      customer.user = user;
      customer.name = user.name;
      customer.email = user.email;
      customer.phone = user.phoneNumber;
    }
    customer.country = data.country;
    customer.region = data.region;
    customer.city = data.city;
    customer.phoneNumber = data.phoneNumber;
    customer.extraInfo = data.extraInfo || null;
    customer.address = `${data.country}, ${data.region}, ${data.city}${data.extraInfo ? ", " + data.extraInfo : ""}`;
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
    customer.country = data.country;
    customer.region = data.region;
    customer.city = data.city;
    customer.phoneNumber = data.phoneNumber;
    customer.extraInfo = data.extraInfo || null;
    customer.address = `${data.country}, ${data.region}, ${data.city}${data.extraInfo ? ", " + data.extraInfo : ""}`;
    customer = await queryRunner.manager.save(customer);
    return customer;
  }
}
