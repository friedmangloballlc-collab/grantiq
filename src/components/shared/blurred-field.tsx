import { TIER_ORDER } from "./upgrade-gate";

export function BlurredField({
  tier,
  requiredTier,
  value,
}: {
  tier: string;
  requiredTier: string;
  value: string;
}) {
  if (TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(requiredTier)) {
    return <span>{value}</span>;
  }
  return <span className="blur-sm select-none">{value}</span>;
}
