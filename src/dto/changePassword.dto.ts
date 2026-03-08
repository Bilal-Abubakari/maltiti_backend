import { IsNotEmpty, IsStrongPassword } from "class-validator";

export class ChangePasswordDto {
  @IsNotEmpty()
  public currentPassword: string;

  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  public newPassword: string;

  @IsNotEmpty()
  public confirmPassword: string;
}
