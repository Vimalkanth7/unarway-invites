/**
 * Global, non-secret business config. meta.json per design may override
 * priceInInr; everything else here applies to every design.
 */
export const siteConfig = {
  name: "Unarway Invites",
  defaultPriceInInr: 599,
  hostedLinkExpiryMonths: 12,
} as const;
