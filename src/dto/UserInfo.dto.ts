import { IsEmail, IsNotEmpty } from "class-validator";

export class UserInfoDto {
  @IsNotEmpty()
  public name: string;

  @IsEmail()
  public email: string;

  @IsNotEmpty()
  public password: string;

  @IsNotEmpty()
  public userType: string;
}

export class VerifyPhoneDto {
  @IsNotEmpty()
  public phoneNumber: string;

  @IsNotEmpty()
  public code: string;
}
