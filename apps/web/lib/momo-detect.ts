export type MomoNetwork = 'MTN' | 'TELECEL' | 'AIRTELTIGO' | 'UNKNOWN';

export type MomoProvider = 'mtn' | 'vod' | 'tgo';

/** Ghana phone prefixes mapped to their likely network. */
const PREFIX_MAP: Record<string, MomoNetwork> = {
  '024': 'MTN',       '025': 'MTN',
  '053': 'MTN',       '054': 'MTN',
  '055': 'MTN',       '059': 'MTN',
  '020': 'TELECEL',   '050': 'TELECEL',
  '026': 'AIRTELTIGO','027': 'AIRTELTIGO',
  '056': 'AIRTELTIGO','057': 'AIRTELTIGO',
};

/** Maps provider enum values to MomoNetwork for comparison. */
const PROVIDER_NETWORK: Record<MomoProvider, MomoNetwork> = {
  mtn: 'MTN',
  vod: 'TELECEL',
  tgo: 'AIRTELTIGO',
};

const NETWORK_LABELS: Record<MomoNetwork, string> = {
  MTN:       'MTN MoMo',
  TELECEL:   'Telecel Cash',
  AIRTELTIGO:'AirtelTigo Money',
  UNKNOWN:   'Unknown',
};

/**
 * Detects the likely network from a Ghana phone number.
 * Accepts formats: 0XXXXXXXXX or 233XXXXXXXXX
 */
export function detectMomoNetwork(phone: string): MomoNetwork {
  const digits = phone.replace(/\D/g, '');
  const local  = digits.startsWith('233') ? '0' + digits.slice(3) : digits;
  const prefix = local.slice(0, 3);
  return PREFIX_MAP[prefix] ?? 'UNKNOWN';
}

/**
 * Returns a soft-warning message when the phone prefix doesn't match the
 * chosen network. Returns null when everything is fine (or undecidable).
 *
 * Per Ghana number-portability rules, this is advisory only — never hard-block.
 */
export function getMomoWarning(phone: string, provider: MomoProvider): string | null {
  const detected  = detectMomoNetwork(phone);
  const expected  = PROVIDER_NETWORK[provider];
  if (detected === 'UNKNOWN' || detected === expected) return null;

  const digits = phone.replace(/\D/g, '');
  const prefix = digits.startsWith('233')
    ? '0' + digits.slice(3, 6)
    : digits.slice(0, 3);

  return (
    `This number (${prefix}…) usually belongs to ${NETWORK_LABELS[detected]}. ` +
    `Continue with ${NETWORK_LABELS[expected]} anyway?`
  );
}

/** Returns a human-readable network label for a provider code. */
export function providerLabel(provider: MomoProvider): string {
  return NETWORK_LABELS[PROVIDER_NETWORK[provider]];
}
