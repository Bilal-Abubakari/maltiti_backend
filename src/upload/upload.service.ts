import { Injectable } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommandInput } from "@aws-sdk/client-s3/dist-types/commands";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UploadService {
  private s3: S3Client;

  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      region: this.configService.get<string>("MALTITI_AWS_REGION"),
      credentials: {
        accessKeyId: this.configService.get<string>(
          "MALTITI_AWS_ACCESS_KEY_ID",
        ),
        secretAccessKey: this.configService.get<string>(
          "MALTITI_AWS_SECRET_ACCESS_KEY",
        ),
      },
    });
  }

  public async uploadImage(image: Express.Multer.File): Promise<string> {
    const file = image; // Assuming you've set up the appropriate multer middleware

    if (!file) {
      throw new Error("No file uploaded");
    }

    const key = `${new Date().getTime()}-${file.originalname}`;
    const params: PutObjectCommandInput = {
      Bucket: this.configService.get<string>("AWS_BUCKET_NAME"),
      Key: key,
      Body: file.buffer,
    };
    const putCommand = new PutObjectCommand(params);

    await this.s3.send(putCommand);

    return `https://${this.configService.get<string>("AWS_BUCKET_NAME")}.s3.amazonaws.com/${key}`;
  }
}
