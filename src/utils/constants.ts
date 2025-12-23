import { UnitOfMeasurement } from "../enum/unit-of-measurement.enum";

export enum userTypes {
  customer = "customer",
  admin = "admin",
}

export enum boxesCharge {
  Tamale = 15,
  Other = 40,
}

export const unitSymbols: Record<UnitOfMeasurement, string> = {
  [UnitOfMeasurement.KILOGRAM]: "kg",
  [UnitOfMeasurement.GRAM]: "g",
  [UnitOfMeasurement.LITRE]: "L",
  [UnitOfMeasurement.MILLILITRE]: "ml",
};
