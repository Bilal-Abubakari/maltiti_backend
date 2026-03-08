import { Module } from "@nestjs/common";
import { CooperativeService } from "./cooperative.service";
import { CooperativeController } from "./cooperative.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cooperative } from "../entities/Cooperative.entity";
import { CooperativeMember } from "../entities/CooperativeMember.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Cooperative, CooperativeMember])],
  providers: [CooperativeService],
  controllers: [CooperativeController],
})
export class CooperativeModule {}
