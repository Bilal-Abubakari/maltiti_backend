import { ApiProperty } from "@nestjs/swagger";
import { UserResponseDto } from "./userResponse.dto";

/**
 * Standard authentication response wrapper
 */
export class AuthResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "User registration successful",
  })
  public message: string;

  @ApiProperty({
    description: "User data",
    type: UserResponseDto,
  })
  public data: UserResponseDto;
}

/**
 * Login response with authentication details
 */
export class LoginResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "You have successfully logged in",
  })
  public message: string;

  @ApiProperty({
    description: "User data (password excluded)",
    type: UserResponseDto,
  })
  public data: UserResponseDto;
}

/**
 * Email verification response
 */
export class EmailVerificationResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Email verified successfully",
  })
  public message: string;

  @ApiProperty({
    description: "Verification status",
    example: true,
  })
  public verified: boolean;
}

/**
 * Token refresh response
 */
export class TokenRefreshResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Tokens refreshed successfully",
  })
  public message: string;
}

/**
 * Logout response
 */
export class LogoutResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Logged out successfully",
  })
  public message: string;
}

/**
 * Password reset email response
 */
export class PasswordResetEmailResponseDto {
  @ApiProperty({
    description: "Success message with email address",
    example: "We have sent a reset email to user@example.com",
  })
  public message: string;

  @ApiProperty({
    description: "User data",
    type: UserResponseDto,
  })
  public data: UserResponseDto;
}

/**
 * Password reset confirmation response
 */
export class PasswordResetResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "You have successfully reset your password",
  })
  public message: string;

  @ApiProperty({
    description: "User data",
    type: UserResponseDto,
  })
  public data: UserResponseDto;
}

/**
 * Phone verification response
 */
export class PhoneVerificationResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Phone verification successful",
  })
  public message: string;

  @ApiProperty({
    description: "User data with verified phone",
    type: UserResponseDto,
  })
  public data: UserResponseDto;
}

/**
 * Customer signup response
 */
export class CustomerSignupResponseDto {
  @ApiProperty({
    description: "Success message with verification instructions",
    example:
      "Email has been sent to user@example.com. Please verify your email",
  })
  public message: string;

  @ApiProperty({
    description: "User data",
    type: UserResponseDto,
  })
  public data: UserResponseDto;
}

/**
 * Admin creation response
 */
export class AdminCreationResponseDto {
  @ApiProperty({
    description: "Success message with email notification",
    example:
      "Admin account created successfully. Credentials have been sent to admin@maltitiaenterprise.com",
  })
  public message: string;

  @ApiProperty({
    description: "Admin user data (password excluded)",
    type: UserResponseDto,
  })
  public data: UserResponseDto;
}

/**
 * Password change response
 */
export class PasswordChangeResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Password changed successfully",
  })
  public message: string;

  @ApiProperty({
    description: "User data",
    type: UserResponseDto,
  })
  public data: UserResponseDto;
}

/**
 * Resend verification email response
 */
export class ResendVerificationResponseDto {
  @ApiProperty({
    description: "Success message with email address",
    example: "Verification email has been resent to user@example.com",
  })
  public message: string;

  @ApiProperty({
    description: "User data",
    type: UserResponseDto,
  })
  public data: UserResponseDto;
}

/**
 * Error response structure
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: "HTTP status code",
    example: 400,
  })
  public statusCode: number;

  @ApiProperty({
    description: "Error message",
    example: "Validation failed",
  })
  public message: string;

  @ApiProperty({
    description: "Error type/reason",
    example: "Bad Request",
  })
  public error: string;
}

/**
 * Validation error response
 */
export class ValidationErrorResponseDto {
  @ApiProperty({
    description: "HTTP status code",
    example: 400,
  })
  public statusCode: number;

  @ApiProperty({
    description: "Detailed validation errors",
    example: ["email must be a valid email", "password is required"],
    isArray: true,
    type: [String],
  })
  public message: string | string[];

  @ApiProperty({
    description: "Error type/reason",
    example: "Bad Request",
  })
  public error: string;
}
