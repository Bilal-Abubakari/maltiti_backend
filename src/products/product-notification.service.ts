import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, IsNull } from "typeorm";
import { Product } from "../entities/Product.entity";
import { Customer } from "../entities/Customer.entity";
import { NotificationService } from "../notification/notification.service";

@Injectable()
export class ProductNotificationService {
  private readonly logger = new Logger(ProductNotificationService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Send new product notification to all customers
   */
  public async sendNewProductNotificationToCustomers(
    product: Product,
  ): Promise<void> {
    try {
      // Get all customers with email addresses
      const customers = await this.customerRepository.find({
        where: {
          email: Not(IsNull()),
          deletedAt: IsNull(),
        },
        relations: ["user"],
      });

      if (customers.length === 0) {
        this.logger.log("No customers found to notify about new product");
        return;
      }

      // Get unique email addresses
      const emailSet = new Set<string>();
      customers.forEach(customer => {
        if (customer.email) {
          emailSet.add(customer.email);
        }
      });

      const customerEmails = Array.from(emailSet);

      if (customerEmails.length === 0) {
        this.logger.log("No valid customer emails found");
        return;
      }

      this.logger.log(
        `Sending new product notification to ${customerEmails.length} customers`,
      );

      // Get product image - use first image from array or fallback to single image
      const productImage =
        product.images && product.images.length > 0
          ? product.images[0]
          : product.image;

      // Get product features from ingredients if available
      const productFeatures = product.ingredients
        ? await Promise.all(
            product.ingredients.map(async ingredient => ingredient.name),
          )
        : undefined;

      // Send notification to all customers
      await this.notificationService.sendNewProductNotification(
        customerEmails,
        {
          customerName: "Valued Customer",
          productName: product.name,
          productImage,
          productCategory: product.category,
          productDescription: product.description,
          wholesalePrice: Number(product.wholesale),
          retailPrice: Number(product.retail),
          inBoxPrice: product.inBoxPrice
            ? Number(product.inBoxPrice)
            : undefined,
          quantityInBox: product.quantityInBox,
          productFeatures,
          productId: product.id,
        },
      );

      this.logger.log(
        `Successfully sent new product notifications for: ${product.name}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending new product notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Detect price changes and send notifications to customers
   */
  public async detectAndNotifyPriceChanges(
    product: Product,
    oldPrices: {
      wholesale: number;
      retail: number;
      inBoxPrice: number | null;
    },
  ): Promise<void> {
    try {
      // Check if any price has changed
      const priceChanges: {
        wholesale?: { old: number; new: number };
        retail?: { old: number; new: number };
        inBoxPrice?: { old: number; new: number };
      } = {};

      const wholesaleChanged =
        Number(product.wholesale) !== Number(oldPrices.wholesale);
      const retailChanged = Number(product.retail) !== Number(oldPrices.retail);
      const inBoxPriceChanged =
        product.inBoxPrice &&
        oldPrices.inBoxPrice &&
        Number(product.inBoxPrice) !== Number(oldPrices.inBoxPrice);

      if (wholesaleChanged) {
        priceChanges.wholesale = {
          old: Number(oldPrices.wholesale),
          new: Number(product.wholesale),
        };
      }

      if (retailChanged) {
        priceChanges.retail = {
          old: Number(oldPrices.retail),
          new: Number(product.retail),
        };
      }

      if (inBoxPriceChanged) {
        priceChanges.inBoxPrice = {
          old: Number(oldPrices.inBoxPrice),
          new: Number(product.inBoxPrice),
        };
      }

      // If no price changes, don't send notifications
      if (Object.keys(priceChanges).length === 0) {
        return;
      }

      this.logger.log(`Price changes detected for product: ${product.name}`);

      // Get all customers with email addresses
      const customers = await this.customerRepository.find({
        where: {
          email: Not(IsNull()),
          deletedAt: IsNull(),
        },
        relations: ["user"],
      });

      if (customers.length === 0) {
        this.logger.log("No customers found to notify about price changes");
        return;
      }

      // Get unique email addresses
      const emailSet = new Set<string>();
      customers.forEach(customer => {
        if (customer.email) {
          emailSet.add(customer.email);
        }
      });

      const customerEmails = Array.from(emailSet);

      if (customerEmails.length === 0) {
        this.logger.log("No valid customer emails found");
        return;
      }

      this.logger.log(
        `Sending price change notification to ${customerEmails.length} customers`,
      );

      // Get product image
      const productImage =
        product.images && product.images.length > 0
          ? product.images[0]
          : product.image;

      // Send price change notification
      await this.notificationService.sendPriceChangeNotification(
        customerEmails,
        {
          customerName: "Valued Customer",
          productName: product.name,
          productImage,
          productCategory: product.category,
          productId: product.id,
          quantityInBox: product.quantityInBox,
        },
        priceChanges,
      );

      this.logger.log(
        `Successfully sent price change notifications for: ${product.name}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending price change notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
