import { IsNotEmpty } from "class-validator";

export class RefreshTokenDto {
  @IsNotEmpty()
  public refreshToken: string;
}
