import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { AuditLog } from "../entities/AuditLog.entity";

/**
 * Module for audit logging functionality
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
