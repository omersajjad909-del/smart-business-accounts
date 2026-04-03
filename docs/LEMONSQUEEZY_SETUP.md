# LemonSqueezy Setup

Use this checklist to connect Finova billing to LemonSqueezy.

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

Use this endpoint:

```text
https://finovaos.app/api/billing/webhook
```

If you want to use the app domain instead:

```text
https://usefinova.app/api/billing/webhook
```

Recommended events:

- `order_created`
- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`
- `subscription_payment_success`
- `subscription_payment_failed`

Copy the webhook signing secret into:

```env
LEMONSQUEEZY_WEBHOOK_SECRET=
```

## 4. What Finova Already Handles

Current backend already supports:

- hosted checkout creation
- plan upgrade / downgrade redirect flow
- webhook signature verification
- company plan updates
- subscription status sync
- renewal date sync
- invoice summary generation
- billing dashboard provider-managed UI

## 5. How Checkout Maps To Finova

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
2. Start checkout from Finova billing page
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
