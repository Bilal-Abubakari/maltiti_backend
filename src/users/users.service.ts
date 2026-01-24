import {
  BadRequestException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RegisterUserDto } from "../dto/registerUser.dto";
import * as bcrypt from "bcrypt";
import { User } from "../entities/User.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { validate } from "class-validator";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { Verification } from "../entities/Verification.entity";
import { generateRandomToken } from "../utils/randomTokenGenerator";
import { VerifyPhoneDto } from "../dto/UserInfo.dto";
import axios from "axios";
import { ForgotPasswordDto, ResetPasswordDto } from "../dto/forgotPassword.dto";
import { NotificationService } from "../notification/notification.service";
import { Role } from "../enum/role.enum";
import { CreateAdminDto } from "../dto/createAdmin.dto";
import { generateRandomPassword } from "../utils/passwordGenerator";
import { ChangePasswordDto } from "../dto/changePassword.dto";
import { UpdateUserDto } from "../dto/updateUser.dto";
import { Status } from "../enum/status.enum";
import { UploadService } from "../upload/upload.service";
import { UploadPresets } from "../interfaces/upload.interface";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private readonly mailService: MailerService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService,
  ) {}

  public async create(userInfo: RegisterUserDto): Promise<User> {
    if (userInfo.password !== userInfo.confirmPassword)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "Password and confirm password do not match",
        },
        HttpStatus.BAD_REQUEST,
      );

    if (await this.findByEmail(userInfo.email))
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "User with email already exists. Please login",
        },
        HttpStatus.CONFLICT,
      );

    const user = new User();
    await this.setUser(user, userInfo);
    const validationErrors = await validate(user);
    if (validationErrors.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: validationErrors,
        },
        HttpStatus.BAD_REQUEST,
      );
    } else {
      return await this.userRepository.manager.transaction(
        async transactionalEntityManager => {
          const userResponse = await transactionalEntityManager.save(
            User,
            user,
          );
          const verification = new Verification();
          verification.user = userResponse;
          verification.type = "email";
          const token = generateRandomToken();
          verification.token = token;
          await transactionalEntityManager.save(Verification, verification);
          const idToken = `auth/verify/${userResponse.id}/${token}`;
          await this.sendVerificationEmail(
            userResponse.email,
            userResponse.name,
            idToken,
          );
          return userResponse;
        },
      );
    }
  }

  private async setUser(user: User, userInfo: RegisterUserDto): Promise<void> {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(userInfo.password, salt);
    user.name = userInfo.name;
    user.phoneNumber = userInfo.phoneNumber;
    user.password = hashedPassword;
    user.userType = userInfo.userType;
    user.email = userInfo.email;
  }

  private async sendVerificationEmail(
    email: string,
    name: string,
    idToken: string,
  ): Promise<void> {
    await this.mailService.sendMail({
      to: email,
      from: "no-reply@maltitiaenterprise.com",
      subject: "Verify Your Email - Maltiti A. Enterprise Ltd",
      template: "./verify-email",
      context: {
        customerName: name,
        verificationLink: `${this.configService.get<string>("FRONTEND_URL")}/${idToken}`,
      },
    });
  }

  public async sendWelcomeMail(
    email: string,
    name: string,
    password: string,
  ): Promise<void> {
    await this.mailService.sendMail({
      to: email,
      from: "noreply@maltitiaenterprise.com",
      subject: "Welcome on board",
      template: "./welcome",
      context: {
        name: name,
        url: this.configService.get<string>("APP_URL"),
        subject: "Welcome on board",
        body: `Your admin has successfully created an account for you on Maltiti A. Enterprise Ltd Backoffice. Please login using the credentials; email: ${email} and password: ${password}`,
        link: "Login",
        action: "Login",
      },
    });
  }

  public async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOneBy({ email: email });
  }

  public async findUserIncludingPasswordByEmail(email: string): Promise<User> {
    return this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.email = :email", { email })
      .getOne();
  }

  public async findOne(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  public async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  public async verifyUserEmail(id: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });
    user.emailVerifiedAt = new Date();
    await this.userRepository.save(user);
  }

  public async validatePassword(
    password: string,
    userPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, userPassword);
  }

  public async phoneVerification(
    id: string,
    phoneInfo: VerifyPhoneDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: {
        phoneNumber: phoneInfo.phoneNumber,
      },
    });
    if (user) {
      throw new HttpException(
        {
          code: HttpStatus.CONFLICT,
          message: "User with phone number already exists",
        },
        HttpStatus.CONFLICT,
      );
    }
    try {
      const response = await axios.post(
        `${this.configService.get<string>("ARKESEL_BASE_URL")}/api/otp/verify`,
        {
          number: phoneInfo.phoneNumber,
          code: phoneInfo.code,
          "api-key": `${this.configService.get<string>("ARKESEL_SMS_API_KEY")}`,
        },
        {
          headers: {
            "api-key": `${this.configService.get<string>("ARKESEL_SMS_API_KEY")}`,
          },
        },
      );
      if (response.data.code === "1100") {
        const user = await this.userRepository.findOneBy({ id });
        user.phoneNumber = phoneInfo.phoneNumber;
        return this.userRepository.save(user);
      }
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: response.data.message,
        },
        HttpStatus.UNAUTHORIZED,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<User> {
    const user = await this.findByEmail(forgotPasswordDto.email);
    if (!user) {
      throw new NotFoundException("User with email does not exists");
    }

    const verification = new Verification();
    const token = generateRandomToken();
    verification.token = token;
    verification.user = user;
    verification.type = "email";
    await this.verificationRepository.save(verification);
    const resetLink =
      user.userType === Role.Admin
        ? `auth/reset-password/${token}`
        : `reset-password/${token}`;
    await this.notificationService.sendEmail(
      "You have requested a password reset. Please click the link below to reset your password. If you did not authorize this please ignore. Someone might have entered your email mistakenly",
      user.email,
      "Forgot Password",
      user.name,
      `${this.configService.get<string>("FRONTEND_URL")}/${resetLink}`,
      `${this.configService.get<string>("APP_URL")}/${resetLink}`,
      "Reset Password",
    );
    return user;
  }

  public async resetPassword({
    token,
    confirmPassword,
    password,
  }: ResetPasswordDto): Promise<User> {
    const verification = await this.verificationRepository.findOneByOrFail({
      token,
    });
    const createdAt = new Date(verification.createdAt).getMinutes();
    const now = new Date().getMinutes();

    const differenceInMinutes = now - createdAt;

    if (differenceInMinutes > 10) {
      throw new GoneException({
        message: "The request for reset has expired. Please try again",
        status: 410,
      });
    }

    if (password !== confirmPassword) {
      throw new BadRequestException({
        message: "Confirm password and password do not match",
        status: 400,
      });
    }

    const user = await this.userRepository.findOneOrFail({
      where: {
        id: verification.user.id,
      },
    });

    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(password, salt);

    return await this.userRepository.save(user);
  }

  public async createAdminUser(
    createAdminDto: CreateAdminDto,
  ): Promise<{ user: User; password: string }> {
    // Validate email domain
    if (!createAdminDto.email.endsWith("@maltitiaenterprise.com")) {
      throw new BadRequestException({
        message:
          "Admin users must have an email address with @maltitiaenterprise.com domain",
        status: 400,
      });
    }

    // Check if user already exists
    if (await this.findByEmail(createAdminDto.email)) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "User with email already exists. Please login",
        },
        HttpStatus.CONFLICT,
      );
    }

    // Generate random password
    const generatedPassword = generateRandomPassword(12);

    // Create user
    const user = new User();
    user.name = createAdminDto.name;
    user.email = createAdminDto.email;
    user.userType = Role.Admin;
    user.emailVerifiedAt = new Date(); // Auto-verify admin accounts
    user.mustChangePassword = true;

    // Hash password
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(generatedPassword, salt);

    // Validate and save user
    const validationErrors = await validate(user);
    if (validationErrors.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: validationErrors,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const savedUser = await this.userRepository.save(user);

    // Send email with credentials
    await this.sendAdminAccountEmail(
      savedUser.email,
      savedUser.name,
      generatedPassword,
    );

    return { user: savedUser, password: generatedPassword };
  }

  private async sendAdminAccountEmail(
    email: string,
    name: string,
    password: string,
  ): Promise<void> {
    await this.mailService.sendMail({
      to: email,
      from: "no-reply@maltitiaenterprise.com",
      subject: "Your Maltiti Admin Portal Account",
      template: "./admin-account",
      context: {
        name: name,
        email: email,
        password: password,
        url: this.configService.get<string>("FRONTEND_URL_ADMIN"),
        subject: "Your Admin Account Has Been Created",
        body: `Your administrator has created an account for you on the Maltiti Admin Portal. Below are your login credentials:`,
        action: "Login to Portal",
      },
    });
  }

  public async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<User> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    // Validate new password and confirm password match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException({
        message: "New password and confirm password do not match",
        status: 400,
      });
    }

    // Get user with password
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.id = :userId", { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Validate current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException({
        message: "Current password is incorrect",
        status: 400,
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    user.updatedAt = new Date();

    return await this.userRepository.save(user);
  }

  public async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  public async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    Object.assign(user, updateUserDto);
    user.updatedAt = new Date();
    return this.userRepository.save(user);
  }

  public async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    await this.userRepository.remove(user);
  }

  public async changeStatus(id: string, status: Status): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.status = status;
    user.updatedAt = new Date();
    return this.userRepository.save(user);
  }

  public async changeRole(id: string, userType: Role): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.userType = userType;
    user.updatedAt = new Date();
    return this.userRepository.save(user);
  }

  /**
   * Upload user avatar
   * Stores file and returns the URL
   */
  public async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const user = await this.findUserById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const avatarUrl = await this.uploadService.upload(
      file,
      UploadPresets.AVATARS_PRESET,
    );

    user.avatarUrl = avatarUrl;
    user.updatedAt = new Date();

    await this.userRepository.save(user);

    return avatarUrl;
  }

  /**
   * Resend verification email to user
   * Creates new verification token and sends email
   */
  public async resendVerificationEmail(email: string): Promise<User> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException("User with email does not exist");
    }

    // Check if email is already verified
    if (user.emailVerifiedAt) {
      throw new BadRequestException({
        message: "Email is already verified",
        status: 400,
      });
    }

    // Delete existing verification tokens for this user
    await this.verificationRepository.delete({
      user: { id: user.id },
      type: "email",
    });

    // Create new verification token
    const verification = new Verification();
    verification.user = user;
    verification.type = "email";
    const token = generateRandomToken();
    verification.token = token;
    await this.verificationRepository.save(verification);

    // Send verification email
    const idToken = `auth/verify/${user.id}/${token}`;
    await this.sendVerificationEmail(user.email, user.name, idToken);

    return user;
  }
}
