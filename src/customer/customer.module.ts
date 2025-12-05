import { Module } from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { CustomerController } from "./customer.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "../entities/Customer.entity";
import { AuthenticationModule } from "../authentication/authentication.module";

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), AuthenticationModule],
  providers: [CustomerService],
  controllers: [CustomerController],
})
export class CustomerModule {}
