import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { ContactUsDto } from "../dto/contactUs.dto";
import {
  ContactUsSuccessResponseDto,
  ContactUsErrorResponseDto,
} from "../dto/contactUsResponse.dto";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly adminEmail: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    // Set admin email from environment or use default
    this.adminEmail =
      this.configService.get<string>("SUPER_ADMIN_EMAIL") ||
      "bilal.abubakari@maltitiaenterprise.com";
  }

  /**
   * Process contact us submission
   * Validates, sanitizes, and sends email to administrator
   */
  public async submitContactForm(
    contactUsDto: ContactUsDto,
    senderIp?: string,
  ): Promise<ContactUsSuccessResponseDto | ContactUsErrorResponseDto> {
    try {
      // Honeypot spam protection - reject if website field is filled
      if (contactUsDto.website) {
        this.logger.warn("Spam detected: honeypot field filled", {
          ip: senderIp,
        });
        // Return success to not reveal honeypot to bots
        return {
          success: true,
          message: "Your message has been sent successfully.",
        };
      }

      // Send email to administrator
      await this.sendAdminNotificationEmail(contactUsDto, senderIp);

      this.logger.log("Contact form submission processed successfully", {
        email: contactUsDto.email || "Not provided",
        ip: senderIp,
      });

      return {
        success: true,
        message: "Your message has been sent successfully.",
      };
    } catch (error) {
      this.logger.error("Failed to process contact form submission", {
        error: error.message,
        stack: error.stack,
        email: contactUsDto.email || "Not provided",
        ip: senderIp,
      });

      throw new HttpException(
        {
          success: false,
          error: "Unable to process your request at the moment.",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send email notification to administrator
   */
  private async sendAdminNotificationEmail(
    contactUsDto: ContactUsDto,
    senderIp?: string,
  ): Promise<void> {
    try {
      const currentYear = new Date().getFullYear();
      const submittedAt = new Date().toISOString();

      await this.mailerService.sendMail({
        to: this.adminEmail,
        from: "no-reply@maltitiaenterprise.com",
        subject: "New Contact Us Submission – Maltiti A. Enterprise Ltd",
        template: "./contact-us",
        context: {
          fullName: contactUsDto.fullName || "Not provided",
          email: contactUsDto.email || "Not provided",
          phoneNumber: contactUsDto.phoneNumber || "Not provided",
          message: contactUsDto.message,
          submittedAt,
          senderIp: senderIp || "Not available",
          currentYear,
        },
      });

      this.logger.log("Admin notification email sent successfully", {
        to: this.adminEmail,
      });
    } catch (error) {
      this.logger.error("Failed to send admin notification email", {
        error: error.message,
        stack: error.stack,
        to: this.adminEmail,
      });
      // Re-throw to be handled by the calling method
      throw error;
    }
  }
}
