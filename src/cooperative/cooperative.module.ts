import { Module } from "@nestjs/common";
import { CooperativeService } from "./cooperative.service";
import { CooperativeController } from "./cooperative.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cooperative } from "../entities/Cooperative.entity";
import { CooperativeMember } from "../entities/CooperativeMember.entity";
import { UploadService } from "../upload/upload.service";

@Module({
  imports: [TypeOrmModule.forFeature([Cooperative, CooperativeMember])],
  providers: [CooperativeService, UploadService],
  controllers: [CooperativeController],
})
export class CooperativeModule {}
