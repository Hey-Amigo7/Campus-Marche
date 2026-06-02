export type CommissionResult = {
  totalAmount: number;
  platformFee: number;
  sellerAmount: number;
  feePercent: number;
  feeFixed: number;
};

/**
 * Calculates marketplace commission and seller receivable.
 *
 * @param totalAmount - The amount the buyer pays (in GHS)
 * @param feePercent  - Platform percentage fee, e.g. 2.5 for 2.5%
 * @param feeFixed    - Platform flat fee in GHS, e.g. 0.50
 *
 * Buyer-pays model: the platform fee is added ON TOP of the seller's listed price.
 * Seller always receives their full listed price; the buyer pays slightly more.
 */
export function calculateCommission(
  baseAmount: number,
  feePercent: number,
  feeFixed: number,
): CommissionResult {
  const rawFee = baseAmount * (feePercent / 100) + feeFixed;
  const platformFee = Math.round(rawFee * 100) / 100;
  const totalAmount = Math.round((baseAmount + platformFee) * 100) / 100;
  const sellerAmount = baseAmount;
  return { totalAmount, platformFee, sellerAmount, feePercent, feeFixed };
}

/** Human-readable label for EscrowStatus enum values */
export const ESCROW_LABELS: Record<string, string> = {
  PENDING_PAYMENT:     'Awaiting Payment',
  PAYMENT_INITIALIZED: 'Payment Initiated',
  PAYMENT_VERIFIED:    'Payment Verified',
  ESCROW_HELD:         'Funds Held in Escrow',
  PROCESSING:          'Processing',
  SHIPPED:             'Shipped',
  DELIVERED:           'Delivered',
  RELEASE_PENDING:     'Releasing Funds',
  RELEASED:            'Funds Released',
  DISPUTED:            'Under Dispute',
  REFUNDED:            'Refunded',
  FAILED:              'Payment Failed',
};

/** Returns the human-readable order status string for a given EscrowStatus */
export function escrowToStatus(escrow: string): string {
  const map: Record<string, string> = {
    PENDING_PAYMENT:     'Awaiting payment',
    PAYMENT_INITIALIZED: 'Payment initiated',
    PAYMENT_VERIFIED:    'Payment verified',
    ESCROW_HELD:         'In progress',
    PROCESSING:          'In progress',
    SHIPPED:             'Out for delivery',
    DELIVERED:           'Delivered',
    RELEASE_PENDING:     'Releasing funds',
    RELEASED:            'Completed',
    DISPUTED:            'Disputed',
    REFUNDED:            'Refunded',
    FAILED:              'Payment failed',
  };
  return map[escrow] ?? 'Unknown';
}

/** Whether a given EscrowStatus means the order has been paid */
export function isEscrowPaid(escrow: string): boolean {
  return [
    'PAYMENT_VERIFIED', 'ESCROW_HELD', 'PROCESSING',
    'SHIPPED', 'DELIVERED', 'RELEASE_PENDING', 'RELEASED',
  ].includes(escrow);
}

/** Paystack bank_code for MoMo transfers (transfer recipients) */
export const MOMO_BANK_CODES: Record<string, string> = {
  MTN_MOMO:        'MTN',
  TELECEL_CASH:    'VOD',
  AIRTELTIGO_MONEY:'ATL',
};

/** Paystack charge provider code for mobile money charges */
export const MOMO_CHARGE_PROVIDERS: Record<string, 'mtn' | 'vod' | 'tgo'> = {
  MTN_MOMO:        'mtn',
  TELECEL_CASH:    'vod',
  AIRTELTIGO_MONEY:'tgo',
};
