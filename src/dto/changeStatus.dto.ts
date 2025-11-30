import { IsEnum } from "class-validator";
import { Status } from "../enum/status.enum";

export class ChangeStatusDto {
  @IsEnum(Status)
  public status: Status;
}
