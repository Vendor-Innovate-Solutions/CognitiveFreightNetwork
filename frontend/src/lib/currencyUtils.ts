/**
 * Currency formatting utilities for Indian Rupees
 */

/**
 * Format amount in Indian Rupees with proper notation
 * Converts to Lakhs (L) or Crores (Cr) as appropriate
 */
export function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) {
    // Crores (1 Cr = 1,00,00,000)
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    // Lakhs (1 L = 1,00,000)
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) {
    // Thousands
    return `₹${(amount / 1000).toFixed(2)} K`;
  } else {
    // Regular amount
    return `₹${amount.toLocaleString("en-IN")}`;
  }
}

/**
 * Format amount with full Indian number system (lakhs, crores)
 */
export function formatIndianNumber(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format demurrage rate for display
 */
export function formatDemurrageRate(ratePerDay: number): string {
  if (ratePerDay >= 100000) {
    return `₹${(ratePerDay / 100000).toFixed(1)} L/day`;
  } else {
    return `₹${ratePerDay.toLocaleString("en-IN")}/day`;
  }
}

/**
 * Get short format for large numbers (for charts)
 */
export function formatShortCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  } else {
    return `₹${amount}`;
  }
}
