import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class DriverDetailsDto {
  @ApiProperty({ description: "Driver name" })
  @IsString()
  @IsNotEmpty()
  public name: string;

  @ApiProperty({ description: "Vehicle/Truck number" })
  @IsString()
  @IsNotEmpty()
  public vehicleNumber: string;

  @ApiProperty({ description: "Driver phone number" })
  @IsString()
  @IsNotEmpty()
  public phoneNumber: string;

  @ApiPropertyOptional({ description: "Driver email" })
  @IsOptional()
  @IsEmail()
  public email?: string;
}

export class ReceiverDetailsDto {
  @ApiProperty({ description: "Receiver name" })
  @IsString()
  @IsNotEmpty()
  public name: string;

  @ApiProperty({ description: "Receiver phone number" })
  @IsString()
  @IsNotEmpty()
  public phone: string;

  @ApiPropertyOptional({ description: "Receiver email" })
  @IsOptional()
  @IsEmail()
  public email?: string;

  @ApiPropertyOptional({ description: "Receiver address" })
  @IsOptional()
  @IsString()
  public address?: string;
}

export class GenerateWaybillDto {
  @ApiProperty({ description: "Driver details", type: DriverDetailsDto })
  @ValidateNested()
  @Type(() => DriverDetailsDto)
  public driver: DriverDetailsDto;

  @ApiPropertyOptional({
    description: "Receiver details (falls back to customer if not provided)",
    type: ReceiverDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceiverDetailsDto)
  public receiver?: ReceiverDetailsDto;

  @ApiPropertyOptional({
    description: "Remarks about the condition of goods",
    default: "All In Good Condition",
  })
  @IsOptional()
  @IsString()
  public remarks?: string;
}
