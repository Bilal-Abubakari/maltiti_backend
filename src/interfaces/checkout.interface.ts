export const orderStatuses = [
  "review",
  "packaging",
  "delivery in progress",
  "delivered",
  "cancelled",
] as const;

export type status = (typeof orderStatuses)[number];

export const paymentStatuses = ["paid", "unpaid", "refunded"];

export type paymentStatus = (typeof paymentStatuses)[number];
