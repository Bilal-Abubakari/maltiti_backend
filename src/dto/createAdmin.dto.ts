import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateAdminDto {
  @IsNotEmpty()
  public name: string;

  @IsEmail()
  @IsNotEmpty()
  public email: string;
}
