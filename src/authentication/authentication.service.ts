import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SignInDto } from '../dto/signIn.dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { RefreshTokenIdsStorage } from './refresh-token-ids-storage';
import { Repository } from 'typeorm';
import { JwtRefreshTokenStrategy } from './strategy/jwt-refresh-token.strategy';
import { IResponse, IUserToken } from '../interfaces/general';
import { Verification } from '../entities/Verification.entity';
import { User } from '../entities/User.entity';

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
  ) {}

  async signIn(signInfo: SignInDto): Promise<IResponse<IUserToken>> {
    const { email, password } = signInfo;

    const user =
      await this.usersService.findUserIncludingPasswordByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordIsValid = await this.usersService.validatePassword(
      password,
      user.password,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1d',
    });

    // Store the refresh token in redis
    await this.refreshTokenIdsStorage.insert(user.id, refreshToken);
    delete user.password;
    return {
      message: 'You have successfully logged in',
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: user,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<unknown> {
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

  async sendWelcomeMail(): Promise<unknown> {
    return await this.mailService.sendMail({
      to: 'abubakaribilal99@gmail.com',
      from: 'abubakaribilal99@gmail.com',
      subject: 'Welcome on board',
      template: './welcome',
      context: {
        name: 'Bilal',
        url: 'http://',
        subject: 'Welcome on board',
        body: 'Welcome to Maltiti A. Enterprise Ltd. We are pleased to have you here. Click the link below to to log in and access our wonderful resources. Welcome once again',
        link: 'Login',
        action: 'Login',
      },
    });
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken);
      await this.refreshTokenIdsStorage.validate(decoded.sub, refreshToken);
      const payload = { sub: decoded.sub, username: decoded.username };
      const accessToken = await this.jwtService.signAsync(payload);
      return { accessToken };
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async invalidateToken(accessToken: string): Promise<void> {
    try {
      const decoded = await this.jwtService.verifyAsync(accessToken);
      await this.refreshTokenIdsStorage.invalidate(decoded.sub);
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async emailVerification(id: string, token: string): Promise<IResponse<User>> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userVerification = await this.verificationRepository.findOneBy({
      token,
    });

    if (
      !userVerification ||
      user.id !== userVerification.user.id ||
      this.isVerificationExpired(userVerification.createdAt)
    ) {
      throw new UnauthorizedException('Token does not exist or has expired');
    }

    await this.verificationRepository.delete({ id: userVerification.id });
    await this.usersService.verifyUserEmail(user.id);

    return {
      message: 'Verification has been successful',
      data: user,
    };
  }

  isVerificationExpired(date: Date): boolean {
    const dateNow = new Date().getTime();
    const difference = dateNow - date.getTime();
    const differenceInSeconds = difference / 1000;
    const differenceInMinutes = differenceInSeconds / 60;

    return differenceInMinutes > 60;
  }
}
