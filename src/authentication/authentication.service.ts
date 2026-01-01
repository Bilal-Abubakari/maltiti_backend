import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SignInDto } from "../dto/signIn.dto";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { MailerService } from "@nestjs-modules/mailer";
import { RefreshTokenIdsStorage } from "./refresh-token-ids-storage";
import { Repository } from "typeorm";
import { JwtRefreshTokenStrategy } from "./strategy/jwt-refresh-token.strategy";
import { IResponse } from "../interfaces/general";
import { Verification } from "../entities/Verification.entity";
import { User } from "../entities/User.entity";
import { AuditService } from "../audit/audit.service";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { Role } from "../enum/role.enum";

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(JwtRefreshTokenStrategy.name);
  constructor(
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailerService,
    private refreshTokenIdsStorage: RefreshTokenIdsStorage,
    private auditService: AuditService,
  ) {}

  public async signIn(signInfo: SignInDto): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    const { email, password } = signInfo;

    const user =
      await this.usersService.findUserIncludingPasswordByEmail(email);

    if (user.userType === Role.User && !user.emailVerifiedAt) {
      throw new UnauthorizedException(
        "User email not verified. We have sent another verification email",
      );
    }

    if (!user) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const passwordIsValid = await this.usersService.validatePassword(
      password,
      user.password,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: "1d",
    });

    // Store the refresh token in redis
    await this.refreshTokenIdsStorage.insert(user.id, refreshToken);
    delete user.password;

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  public async validateUser(email: string, password: string): Promise<unknown> {
    const user = await this.usersService.findByEmail(email);
    if (
      user &&
      (await this.usersService.validatePassword(password, user.password))
    ) {
      const { ...result } = user;
      return result;
    }
    return null;
  }

  public async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken);
      await this.refreshTokenIdsStorage.validate(decoded.sub, refreshToken);

      const payload = { sub: decoded.sub, email: decoded.email };
      const accessToken = await this.jwtService.signAsync(payload);

      // Generate new refresh token for rotation
      const newRefreshToken = await this.jwtService.signAsync(payload, {
        expiresIn: "1d",
      });

      // Invalidate old refresh token and store new one
      await this.refreshTokenIdsStorage.invalidate(decoded.sub);
      await this.refreshTokenIdsStorage.insert(decoded.sub, newRefreshToken);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  public async invalidateToken(
    accessToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const decoded = await this.jwtService.verifyAsync(accessToken);
      const user = await this.usersService.findOne(decoded.sub);

      await this.refreshTokenIdsStorage.invalidate(decoded.sub);

      // Log logout
      if (user) {
        await this.auditService.createAuditLog({
          actionType: AuditActionType.LOGOUT,
          entityType: AuditEntityType.AUTHENTICATION,
          description: `User ${user.name} logged out`,
          performedByUserId: user.id,
          performedByUserName: user.name,
          performedByRole: user.userType,
          ipAddress,
          userAgent,
        });
      }
    } catch (error) {
      throw new UnauthorizedException("Invalid access token");
    }
  }

  public async emailVerification(
    id: string,
    token: string,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const userVerification = await this.verificationRepository.findOneBy({
      token,
    });

    if (
      !userVerification ||
      user.id !== userVerification.user.id ||
      this.isVerificationExpired(userVerification.createdAt)
    ) {
      throw new UnauthorizedException("Token does not exist or has expired");
    }

    await this.verificationRepository.delete({ id: userVerification.id });
    await this.usersService.verifyUserEmail(user.id);

    return {
      message: "Verification has been successful",
      data: user,
    };
  }

  private isVerificationExpired(date: Date): boolean {
    const dateNow = new Date().getTime();
    const difference = dateNow - date.getTime();
    const differenceInSeconds = difference / 1000;
    const differenceInMinutes = differenceInSeconds / 60;

    return differenceInMinutes > 60;
  }
}
