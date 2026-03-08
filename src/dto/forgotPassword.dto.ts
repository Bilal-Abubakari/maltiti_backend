import { IsEmail, IsNotEmpty, IsStrongPassword } from "class-validator";

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  public email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  public token: string;

  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  public password: string;

  @IsNotEmpty()
  public confirmPassword: string;
}
