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

@Controller("authentication")
export class AuthenticationController {
  constructor(
    private usersService: UsersService,
    private authService: AuthenticationService,
  ) {}

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

  @Get("verify/:id/:token")
  public async emailVerification(
    @Param("id") id: string,
    @Param("token") token: string,
  ): Promise<void> {
    await this.authService.emailVerification(id, token);
  }

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

    if (token) {
      await this.authService.invalidateToken(token);
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
}
