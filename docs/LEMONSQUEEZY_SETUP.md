# LemonSqueezy Setup

Use this checklist to connect FinovaOS billing to LemonSqueezy.

## 1. Create Products And Variants

Create these plans inside LemonSqueezy:

- `Starter Monthly`
- `Starter Yearly`
- `Professional Monthly`
- `Professional Yearly`
- `Enterprise Monthly`
- `Enterprise Yearly`

Optional:

- `Custom Monthly`
- `Custom Yearly`

Copy each variant ID.

## 2. Add Environment Variables

Set these in local `.env` and in Vercel:

```env
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_TEST_MODE=false
LEMONSQUEEZY_VARIANT_STARTER_MONTHLY=
LEMONSQUEEZY_VARIANT_STARTER_YEARLY=
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=
LEMONSQUEEZY_VARIANT_PRO_YEARLY=
LEMONSQUEEZY_VARIANT_ENTERPRISE_MONTHLY=
LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY=
LEMONSQUEEZY_VARIANT_CUSTOM_MONTHLY=
LEMONSQUEEZY_VARIANT_CUSTOM_YEARLY=
```

## 3. Add Webhook In LemonSqueezy

Use the app domain — the same value as `NEXT_PUBLIC_APP_URL`:

```text
https://usefinova.app/api/billing/webhook
```

Events to enable — these are exactly the ones `app/api/billing/webhook/route.ts`
implements:

| Event | Handled by FinovaOS |
| --- | --- |
| `order_created` | logs `PAYMENT_EVENT` |
| `order_refunded` | logs `REFUND_PROCESSED` + refund email |
| `subscription_created` | sets plan + `ACTIVE` status, sends welcome email |
| `subscription_updated` | plan / status sync |
| `subscription_cancelled` | status sync |
| `subscription_resumed` | status sync |
| `subscription_expired` | status sync |
| `subscription_paused` | status sync |
| `subscription_unpaused` | status sync |
| `subscription_payment_success` | receipt email, clears dunning, duplicate-charge check |
| `subscription_payment_failed` | starts dunning, sets `PAST_DUE` |
| `subscription_payment_refunded` | logs `REFUND_PROCESSED` + refund email |

Leave these unchecked — no handler exists for them: `affiliate_activated`,
`customer_updated`, `dispute_created`, `dispute_resolved`,
`license_key_created`, `license_key_updated`.

`subscription_plan_changed` is also not handled: it is not in the
`SUBSCRIPTION_STATUS_EVENTS` set, so enabling it delivers events that are
silently ignored. Upgrades and downgrades still sync because LemonSqueezy
fires `subscription_updated` alongside it.

Copy the webhook signing secret into:

```env
LEMONSQUEEZY_WEBHOOK_SECRET=
```

The same value must be set locally and in Vercel. If it does not match the
secret stored in LemonSqueezy, `verifyLemonSignature` rejects every event
with a 400.

## 4. What FinovaOS Already Handles

Current backend already supports:

- hosted checkout creation
- plan upgrade / downgrade redirect flow
- webhook signature verification
- company plan updates
- subscription status sync
- renewal date sync
- invoice summary generation
- billing dashboard provider-managed UI

## 5. How Checkout Maps To FinovaOS

Checkout sends this custom data:

- `company_id`
- `user_id`
- `plan_code`
- `billing_cycle`
- `display_currency`
- `display_country`

Webhook uses that data to update the right company.

## 6. Quick Test Flow

1. Set `LEMONSQUEEZY_TEST_MODE=true`
2. Start checkout from FinovaOS billing page
3. Complete test purchase in LemonSqueezy
4. Confirm webhook hits `/api/billing/webhook`
5. Check:
   - company plan updated
   - subscription row updated
   - billing page shows new plan
   - invoice history shows billing record

## 7. Production Go-Live

Before live launch:

1. switch `LEMONSQUEEZY_TEST_MODE=false`
2. replace test variant IDs with live IDs
3. confirm webhook secret matches live webhook
4. run one real checkout
5. verify renewal and cancellation events
