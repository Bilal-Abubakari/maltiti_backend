import { Product } from "../entities/Product.entity";

export type LightProduct = Pick<
  Product,
  "id" | "name" | "retail" | "wholesale"
>;
