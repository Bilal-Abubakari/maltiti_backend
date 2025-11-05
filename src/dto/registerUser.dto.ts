import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsStrongPassword,
} from "class-validator";
import { Role } from "../enum/role.enum";

export class RegisterUserDto {
  @IsNotEmpty()
  public name: string;

  @IsEmail()
  public email: string;

  @IsNotEmpty()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      minUppercase: 1,
    },
    { always: true },
  )
  public password: string;

  @IsNotEmpty()
  public confirmPassword: string;

  @IsNotEmpty()
  @IsEnum(Role)
  public userType: Role;

  @IsOptional()
  @IsPhoneNumber()
  public phoneNumber?: string;
}
