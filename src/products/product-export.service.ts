import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../entities/Product.entity";
import { ExportProductQueryDto } from "../dto/productQuery.dto";
import { ProductStatus } from "../enum/product-status.enum";
import * as ExcelJS from "exceljs";

@Injectable()
export class ProductExportService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  /**
   * Get all products for export (without pagination, with filters)
   */
  public async getProductsForExport(
    queryDto: ExportProductQueryDto,
  ): Promise<Product[]> {
    const {
      searchTerm,
      category,
      status,
      grade,
      unitOfMeasurement,
      isFeatured,
      isOrganic,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "DESC",
      batchId,
    } = queryDto;

    const queryBuilder = this.productsRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.ingredients", "ingredient")
      .where("product.deletedAt IS NULL");

    // Search functionality
    if (searchTerm) {
      queryBuilder.andWhere(
        "(LOWER(product.name) LIKE LOWER(:searchTerm) OR LOWER(product.description) LIKE LOWER(:searchTerm))",
        { searchTerm: `%${searchTerm}%` },
      );
    }

    // Filter by category
    if (category) {
      queryBuilder.andWhere("product.category = :category", { category });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere("product.status = :status", { status });
    }

    // Filter by grade
    if (grade) {
      queryBuilder.andWhere("product.grade = :grade", { grade });
    }

    // Filter by unit of measurement
    if (unitOfMeasurement) {
      queryBuilder.andWhere("product.unitOfMeasurement = :unitOfMeasurement", {
        unitOfMeasurement,
      });
    }

    // Filter by featured
    if (isFeatured !== undefined) {
      queryBuilder.andWhere("product.isFeatured = :isFeatured", { isFeatured });
    }

    // Filter by organic
    if (isOrganic !== undefined) {
      queryBuilder.andWhere("product.isOrganic = :isOrganic", { isOrganic });
    }

    // Filter by price range
    if (minPrice !== undefined) {
      queryBuilder.andWhere("product.retail >= :minPrice", { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere("product.retail <= :maxPrice", { maxPrice });
    }

    // Filter by batch
    if (batchId) {
      queryBuilder.andWhere("product.batchId = :batchId", { batchId });
    }

    // Sorting
    const allowedSortFields = ["name", "retail", "createdAt", "rating"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    queryBuilder.orderBy(`product.${sortField}`, sortOrder);

    // No pagination for export
    return await queryBuilder.getMany();
  }

  /**
   * Generate Excel file for products export
   */
  public async generateProductsExcel(
    products: Product[],
  ): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products Export");

    // Define columns with headers matching Maltiti's product structure
    worksheet.columns = [
      { header: "Product Name", key: "name", width: 30 },
      { header: "SKU", key: "sku", width: 15 },
      { header: "Category", key: "category", width: 20 },
      { header: "Grade", key: "grade", width: 10 },
      { header: "Status", key: "status", width: 10 },
      { header: "Wholesale Price", key: "wholesale", width: 15 },
      { header: "Retail Price", key: "retail", width: 15 },
      { header: "Weight", key: "weight", width: 10 },
      { header: "Unit of Measurement", key: "unitOfMeasurement", width: 20 },
      { header: "Is Featured", key: "isFeatured", width: 12 },
      { header: "Is Organic", key: "isOrganic", width: 12 },
      { header: "Rating", key: "rating", width: 10 },
      { header: "Reviews", key: "reviews", width: 10 },
      { header: "Created Date", key: "createdAt", width: 20 },
    ];

    // Style header row: Bold and centered
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };

    // Add data rows with conditional formatting
    products.forEach(product => {
      const row = worksheet.addRow({
        name: product.name,
        sku: product.sku || "N/A",
        category: product.category,
        grade: product.grade || "N/A",
        status: product.status,
        wholesale: product.wholesale,
        retail: product.retail,
        weight: product.weight || "N/A",
        unitOfMeasurement: product.unitOfMeasurement || "N/A",
        isFeatured: product.isFeatured ? "Yes" : "No",
        isOrganic: product.isOrganic ? "Yes" : "No",
        rating: product.rating,
        reviews: product.reviews,
        createdAt: product.createdAt.toISOString().split("T")[0], // Format as YYYY-MM-DD
      });

      // Highlight inactive products in light red
      if (product.status === ProductStatus.INACTIVE) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFCCCC" }, // Light red
        };
      }
    });

    // Auto-adjust column widths
    worksheet.columns.forEach(column => {
      if (column.width) {
        column.width = Math.max(column.width, 10); // Minimum width
      }
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Export products to Excel with optional filters
   */
  public async exportProductsToExcel(
    queryDto: ExportProductQueryDto,
  ): Promise<ExcelJS.Buffer> {
    try {
      // Fetch products with applied filters
      const products = await this.getProductsForExport(queryDto);

      // Log export operation for auditing
      console.log(
        `Exporting ${products.length} products to Excel with filters:`,
        queryDto,
      );

      // Handle empty dataset gracefully
      if (products.length === 0) {
        throw new Error("No products found matching the specified filters");
      }

      // Generate Excel file
      return await this.generateProductsExcel(products);
    } catch (error) {
      console.error("Error generating products Excel export:", error);
      throw error;
    }
  }
}
