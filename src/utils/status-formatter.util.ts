/**
 * Converts an enum string value to a human-readable format.
 * Replaces underscores with spaces and capitalizes each word.
 * @param status - The enum string value (e.g., "in_transit")
 * @returns The formatted readable string (e.g., "In Transit")
 */
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
