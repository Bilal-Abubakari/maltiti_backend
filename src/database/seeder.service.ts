import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { User } from "../entities/User.entity";
import { Role } from "../enum/role.enum";
import * as bcrypt from "bcrypt";

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin(): Promise<void> {
    const superAdminEmail = this.configService.get<string>("SUPER_ADMIN_EMAIL");
    const superAdminPassword = this.configService.get<string>(
      "SUPER_ADMIN_PASSWORD",
    );
    const superAdminName = this.configService.get<string>("SUPER_ADMIN_NAME");

    if (!superAdminEmail || !superAdminPassword) {
      this.logger.warn(
        "Super admin credentials not found in environment variables. Skipping super admin seeding.",
      );
      return;
    }

    try {
      // Check if super admin already exists
      const existingSuperAdmin = await this.userRepository.findOne({
        where: { email: superAdminEmail },
      });

      if (existingSuperAdmin) {
        this.logger.log(
          `Super admin already exists with email: ${superAdminEmail}`,
        );
        return;
      }

      // Create super admin
      const superAdmin = new User();
      superAdmin.email = superAdminEmail;
      superAdmin.name = superAdminName;
      superAdmin.userType = Role.SuperAdmin;
      superAdmin.emailVerifiedAt = new Date();
      superAdmin.mustChangePassword = false;
      superAdmin.createdAt = new Date();
      superAdmin.updatedAt = new Date();

      // Hash password
      const salt = await bcrypt.genSalt();
      superAdmin.password = await bcrypt.hash(superAdminPassword, salt);

      // Save super admin
      await this.userRepository.save(superAdmin);

      this.logger.log(
        `Super admin created successfully with email: ${superAdminEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to seed super admin: ${error.message}`,
        error.stack,
      );
    }
  }
}
