import { ApiProperty } from "@nestjs/swagger";

export class UploadResponseDto {
  @ApiProperty({ description: "Success message" })
  public message: string;

  @ApiProperty({ description: "The URL of the uploaded image" })
  public data: string;
}
