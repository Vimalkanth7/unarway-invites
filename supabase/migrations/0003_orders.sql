-- Phase 6: one row per Razorpay order attempt. Amount is stored in paise
-- (Razorpay's own unit) to avoid float rounding. Rows are only ever written
-- by server code using the service-role client (order creation, payment
-- verification, and the webhook all run without -- or without trusting --
-- the user's own session), so no insert/update/delete policy is granted to
-- the authenticated role; RLS still restricts what a user could ever read.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount integer not null,
  currency text not null default 'INR',
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create index orders_invitation_id_idx on public.orders (invitation_id);
create index orders_user_id_idx on public.orders (user_id);

alter table public.orders enable row level security;

create policy "Users can view their own orders"
on public.orders for select
to authenticated
using (user_id = auth.uid());
