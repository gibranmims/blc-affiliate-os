# Configuration Values

**Domain:** Config (not knowledge)
**Last updated:** 2026-08-06

> **Why these are separate.** Everything here changes without anyone editing the
> knowledge base. A promo code expires, a price moves, a shipping window shifts —
> and a KB that hardcoded it starts promising things that fail at checkout. Worse,
> it fails *silently*: nobody notices until a customer complains.
>
> These are retrieved at **runtime**. If a value is expired or missing, the agent
> **does not promise it** and flags the record for review.

## Rules

1. The agent never quotes a value from memory — always reads current config.
2. Every value carries a `review_by` date.
3. Past `review_by` → treat as **stale**: do not quote, use the fallback wording,
   notify via Telegram.
4. Missing value → same behavior. Absence is never treated as zero or "none."
5. Price-derived values (e.g. commission per bottle) are **computed**, never stored
   independently — otherwise they drift out of sync with price.

---

## Values

| Key | Value | Source | `review_by` | Fallback if stale |
|---|---|---|---|---|
| `promo.first_order_code` | `BBL10` | Live site | 2026-09-06 | "Current promotions are shown at checkout." |
| `shipping.processing_days` | 1–3 business days | Live site | 2026-11-06 | "Processing times are shown at checkout." |
| `shipping.us_delivery_days` | 5–8 business days | Live site | 2026-11-06 | "Delivery estimates are shown with your tracking." |
| `product.price` | ⚠️ **unset** | Shopify | — | Do not quote a price. |
| `partner.commission_pct` | 40% | Partner site | 2026-11-06 | "Commission details are on the partner page." |
| `partner.commission_per_bottle` | *computed:* `price × commission_pct` | — | — | Omit the dollar figure; quote the percentage only. |
| `partner.review_hours` | ~48 hours | Partner site | 2026-11-06 | "Applications are reviewed before acceptance." |
| `subscription.discount_pct` | ⚠️ **unverified** (was 20%) | Shopify | — | "Current subscription pricing is shown on the product page at checkout." |
| `threshold.lost_in_transit_days` | 7 calendar days | Policy §27 | — | — |
| `threshold.significantly_delayed_days` | 5 business days past ETA | Policy §27 | — | — |
| `threshold.high_value_order_usd` | 150 | Policy §27 | — | — |
| `threshold.large_order_bottles` | 4 | Policy §27 | — | — |
| `threshold.repeat_count` | 2 | Policy §27 | — | — |
| `threshold.repeat_window_months` | 12 | Policy §27 | — | — |
| `threshold.approval_expiry_hours` | 24 | Policy §27 | — | — |

## Unset values blocking accurate answers

- **`product.price`** — blocks the Pro Partner "~$15 per bottle" answer. Until set,
  the agent quotes 40% and omits the dollar figure.
- **`subscription.discount_pct`** — the 20% figure is unverified and must not be
  quoted.

## Still unresolved in product knowledge

Tracked in [`products/bbl-serum.md`](products/bbl-serum.md) §19:

- Period after opening (PAO)
- Average bottle duration → blocks subscription cadence recommendations
