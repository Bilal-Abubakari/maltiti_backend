import { IsEmail, IsNotEmpty } from "class-validator";

export class SignInDto {
  @IsNotEmpty()
  @IsEmail()
  public email: string;

  @IsNotEmpty()
  public password: string;
}
