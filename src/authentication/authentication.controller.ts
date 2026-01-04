import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
} from "@nestjs/common";
import { IResponse } from "../interfaces/general";
import { UsersService } from "../users/users.service";
import { RegisterUserDto } from "../dto/registerUser.dto";
import { SignInDto } from "../dto/signIn.dto";
import { AuthenticationService } from "./authentication.service";
import { CookieAuthGuard } from "./guards/cookie-auth.guard";
import { Request, Response } from "express";
import { User } from "../entities/User.entity";
import { VerifyPhoneDto } from "../dto/UserInfo.dto";
import { Roles } from "./guards/roles/roles.decorator";
import { RolesGuard } from "./guards/roles/roles.guard";
import { ForgotPasswordDto, ResetPasswordDto } from "../dto/forgotPassword.dto";
import { CreateAdminDto } from "../dto/createAdmin.dto";
import { ChangePasswordDto } from "../dto/changePassword.dto";
import { Role } from "../enum/role.enum";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiCookieAuth,
} from "@nestjs/swagger";
import {
  AdminCreationResponseDto,
  AuthResponseDto,
  CustomerSignupResponseDto,
  ErrorResponseDto,
  LoginResponseDto,
  LogoutResponseDto,
  PasswordChangeResponseDto,
  PasswordResetEmailResponseDto,
  PasswordResetResponseDto,
  PhoneVerificationResponseDto,
  ResendVerificationResponseDto,
  TokenRefreshResponseDto,
  ValidationErrorResponseDto,
} from "../dto/authResponse.dto";
import { ResendVerificationDto } from "../dto/resendVerification.dto";

@ApiTags("Authentication")
@Controller("authentication")
export class AuthenticationController {
  constructor(
    private usersService: UsersService,
    private authService: AuthenticationService,
  ) {}

  @ApiOperation({
    summary: "Register a new user",
    description: "Creates a new user account and sends a verification email",
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: "User registration successful",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "User with email already exists",
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe())
  @Post("sign-up")
  public async register(
    @Body() userInfo: RegisterUserDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.create(userInfo);
    delete user.password;
    return {
      message: "User registration successful",
      data: user,
    };
  }

  @ApiOperation({
    summary: "Verify phone number",
    description: "Verifies user phone number using OTP code",
  })
  @ApiParam({
    name: "id",
    description: "User ID",
    type: "string",
  })
  @ApiBody({ type: VerifyPhoneDto })
  @ApiCookieAuth()
  @ApiResponse({
    status: 200,
    description: "Phone verification successful",
    type: PhoneVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid OTP code or validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing token",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "User with phone number already exists",
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe())
  @Post("verify-phone/:id")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.User])
  public async verifyPhone(
    @Param("id") id: string,
    @Body() phoneInfo: VerifyPhoneDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.phoneVerification(id, phoneInfo);
    delete user.password;
    return {
      message: "Phone verification successful",
      data: user,
    };
  }

  @ApiOperation({
    summary: "Customer signup",
    description: "Register a new customer account with email verification",
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: "Customer account created, verification email sent",
    type: CustomerSignupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "User with email already exists",
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe())
  @Post("customer-signup")
  public async customerSignup(
    @Body() userInfo: RegisterUserDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.create(userInfo);
    delete user.password;
    return {
      message: `Email has been sent to ${user.email}. Please verify your email`,
      data: user,
    };
  }

  @ApiOperation({
    summary: "User login",
    description:
      "Authenticates user and returns access token and refresh token in HTTP-only cookies. Also logs the login event in audit logs.",
  })
  @ApiBody({ type: SignInDto })
  @ApiResponse({
    status: 200,
    description:
      "Login successful, tokens set in cookies (accessToken: 15min, refreshToken: 1day)",
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid email or password",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Account is inactive or suspended",
    type: ErrorResponseDto,
  })
  @Post("login")
  public async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<IResponse<User>> {
    const { user, accessToken, refreshToken } =
      await this.authService.signIn(signInDto);

    // Set access token in HTTP-only cookie (15 minutes expiry)
    response.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token in HTTP-only cookie (1 day expiry)
    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return {
      message: "You have successfully logged in",
      data: user,
    };
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (request.headers["x-real-ip"] as string) ||
      request.ip ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request as any).connection?.remoteAddress ||
      "unknown"
    );
  }

  @ApiOperation({
    summary: "Request password reset",
    description: "Sends a password reset link to the user's email",
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: "Password reset email sent successfully",
    type: PasswordResetEmailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User with email does not exist",
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe())
  @Post("forgot-password")
  public async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.forgotPassword(forgotPasswordDto);
    return {
      message: `We have sent a reset email to ${user.email}`,
      data: user,
    };
  }

  @ApiOperation({
    summary: "Reset password",
    description: "Resets user password using the reset token from email",
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: "Password reset successful",
    type: PasswordResetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - passwords do not match or validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found or invalid token",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 410,
    description: "Reset token has expired",
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe())
  @Post("reset-password")
  public async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.resetPassword(resetPasswordDto);
    return {
      message: `You have successfully reset your password`,
      data: user,
    };
  }

  @ApiOperation({
    summary: "Verify email address",
    description:
      "Verifies user email using the verification token from email and logs the user in. Sets authentication cookies (accessToken: 15min, refreshToken: 1day).",
  })
  @ApiParam({
    name: "id",
    description: "User ID",
    type: "string",
  })
  @ApiParam({
    name: "token",
    description: "Verification token",
    type: "string",
  })
  @ApiResponse({
    status: 200,
    description: "Email verification successful and user logged in",
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Token does not exist or has expired",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    type: ErrorResponseDto,
  })
  @Get("verify/:id/:token")
  public async emailVerification(
    @Param("id") id: string,
    @Param("token") token: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<IResponse<User>> {
    const { user, accessToken, refreshToken } =
      await this.authService.emailVerification(id, token);

    // Set authentication cookies to log the user in
    response.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return {
      message: "Email verified successfully. You are now logged in.",
      data: user,
    };
  }

  @ApiOperation({
    summary: "Refresh access token",
    description:
      "Generates new access and refresh tokens using the refresh token from cookies. Implements token rotation for security.",
  })
  @ApiCookieAuth()
  @ApiResponse({
    status: 200,
    description:
      "Tokens refreshed successfully, new tokens set in cookies (accessToken: 15min, refreshToken: 1day)",
    type: TokenRefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid, expired, or missing refresh token",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    type: ErrorResponseDto,
  })
  @Post("refresh-token")
  public async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token not found");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshAccessToken(refreshToken);

    // Set new access token in HTTP-only cookie
    response.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set new refresh token in HTTP-only cookie (token rotation)
    response.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return { message: "Tokens refreshed successfully" };
  }

  @ApiOperation({
    summary: "User logout",
    description:
      "Invalidates the current session, clears authentication cookies, and logs the logout event in audit logs",
  })
  @ApiCookieAuth()
  @ApiResponse({
    status: 200,
    description: "Logged out successfully, cookies cleared",
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - not logged in",
    type: ErrorResponseDto,
  })
  @UseGuards(CookieAuthGuard)
  @Post("logout")
  public async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    // Get token from cookie or authorization header (backward compatibility)
    const token =
      request.cookies?.accessToken ||
      request.headers.authorization?.split(" ")[1];

    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers["user-agent"];

    if (token) {
      await this.authService.invalidateToken(token, ipAddress, userAgent);
    }

    // Clear cookies
    response.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    response.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return { message: "Logged out successfully" };
  }

  @ApiOperation({
    summary: "Create admin user (Super Admin only)",
    description:
      "Creates a new admin user account with auto-generated password. Credentials are sent via email. Only Super Admin can create admin accounts.",
  })
  @ApiBody({ type: CreateAdminDto })
  @ApiCookieAuth()
  @ApiResponse({
    status: 201,
    description:
      "Admin account created successfully, credentials sent to email",
    type: AdminCreationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - email must be @maltitiaenterprise.com or validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - not logged in",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - requires Super Admin role",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "User with email already exists",
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe())
  @Post("create-admin")
  @UseGuards(CookieAuthGuard)
  @Roles([Role.SuperAdmin])
  public async createAdmin(
    @Body() createAdminDto: CreateAdminDto,
  ): Promise<IResponse<User>> {
    const { user } = await this.usersService.createAdminUser(createAdminDto);
    delete user.password;
    return {
      message: `Admin account created successfully. Credentials have been sent to ${user.email}`,
      data: user,
    };
  }

  @ApiOperation({
    summary: "Change password",
    description:
      "Changes user password. Requires current password for validation. Updates mustChangePassword flag to false.",
  })
  @ApiParam({
    name: "id",
    description: "User ID",
    type: "string",
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiCookieAuth()
  @ApiResponse({
    status: 200,
    description: "Password changed successfully",
    type: PasswordChangeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - passwords do not match, current password is incorrect, or validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - not logged in",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe())
  @Post("change-password/:id")
  @UseGuards(CookieAuthGuard)
  public async changePassword(
    @Param("id") id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.changePassword(id, changePasswordDto);
    delete user.password;
    return {
      message: "Password changed successfully",
      data: user,
    };
  }

  @ApiOperation({
    summary: "Resend verification email",
    description:
      "Resends the email verification link to the user's email address. Creates a new verification token and sends a new verification email.",
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: "Verification email resent successfully",
    type: ResendVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - email already verified or validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User with email does not exist",
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe())
  @Post("resend-verification")
  public async resendVerificationEmail(
    @Body() resendVerificationDto: ResendVerificationDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.resendVerificationEmail(
      resendVerificationDto.email,
    );
    delete user.password;
    return {
      message: `Verification email has been resent to ${user.email}`,
      data: user,
    };
  }
}
