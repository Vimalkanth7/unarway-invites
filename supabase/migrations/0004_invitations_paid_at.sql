-- Phase 6: timestamp of the moment an invitation became paid, so the
-- /i/<short-id> expiry (siteConfig.hostedLinkExpiryMonths) can be computed
-- without joining through orders. Null while status = 'draft'.
alter table public.invitations
  add column paid_at timestamptz;
