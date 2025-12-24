import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { AuditLog } from "../entities/AuditLog.entity";
import { AuthenticationModule } from "../authentication/authentication.module";

/**
 * Module for audit logging functionality
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    forwardRef(() => AuthenticationModule),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
