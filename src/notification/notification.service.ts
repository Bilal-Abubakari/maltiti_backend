import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class NotificationService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  public async sendSms(to: string, message: string): Promise<unknown> {
    try {
      return await axios.post(
        `${this.configService.get<string>("ARKESEL_BASE_URL")}/api/v2/sms/send`,
        {
          recipients: [to],
          sender: "Maltiti",
          message,
        },
        {
          headers: {
            "api-key": this.configService.get<string>("ARKESEL_SMS_API_KEY"),
          },
        },
      );
    } catch (error) {
      console.log(error, "error");
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async sendEmail(
    body: string,
    to: string | string[],
    subject: string,
    name: string,
    url: string,
    link: string,
    action: string,
  ): Promise<unknown> {
    return await this.mailerService.sendMail({
      to,
      from: "info@maltitiaenterprise.com",
      subject,
      template: "./welcome",
      context: {
        name,
        url,
        subject,
        body,
        link,
        action,
      },
    });
  }
}
