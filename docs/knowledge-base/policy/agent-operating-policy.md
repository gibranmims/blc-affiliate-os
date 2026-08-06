# Agent Operating Policy — Sending, Identity, Authority

**Domain:** Policy (agent governance)
**Version:** 1.0
**Last updated:** 2026-08-06

> This file governs **what the agent is allowed to do**, as distinct from what it
> knows. Product facts live in `products/`. Channel rules live in
> `shipping-returns-refunds.md`. This is the authority layer.

---

## 1. Locked vocabulary

Ambiguity in these terms caused the contradictions in policy v1. Use these exact
terms internally and nowhere else use loose synonyms like "answer automatically."

| Term | Meaning |
|---|---|
| **Draft automatically** | Agent prepares a response but does **not** send it |
| **Send automatically** | Agent delivers the response **without** human approval |
| **Prepare action** | Agent gathers information and builds the proposed Shopify action |
| **Execute action** | Agent changes money, fulfillment, customer information, or order state |
| **Routine approval** | Resolution is predetermined; Tamar still taps to authorize execution |
| **Escalation** | Tamar's judgment or direct involvement is required |

---

## 2. Canonical v1 sending policy

**Probation: the first 50 customer-support replies OR 14 calendar days, whichever
comes first.**

During probation:

- The agent **drafts every** customer-facing response
- **Nothing** is sent automatically
- Tamar reviews and approves each reply
- The agent records whether each draft was **approved as written / edited /
  rejected**
- Refunds, replacements, cancellations, address changes, and sensitive cases
  continue to follow their **separate** approval process regardless of probation

After probation, tier 1 replies may be enabled for automatic sending **only if the
quality threshold is met.**

## 3. Auto-send quality threshold

Tier 1 may switch to automatic sending when **all** of the following hold:

- ≥ **95%** of drafts were approved without material edits
- **Zero** privacy breaches
- **Zero** false claims that an order action had completed
- **Zero** incorrect order matches
- **Zero** medical claims or unsafe reaction responses
- **Zero** messages sent in the wrong channel style
- **Zero** exposed internal notes, codes, or policies
- Tamar has **explicitly enabled** auto-send

> A grammar or wording edit is **not** necessarily a material error.

### Material error
Wrong order · wrong customer · wrong policy · wrong product instruction ·
unsupported tracking information · promising money or fulfillment · sharing private
data · missing a required escalation · sending an email-style reply in TikTok chat

## 4. Tier 1 — may eventually auto-send

General product questions · ingredient questions · how-to-use guidance · expected
result timelines · sensitive-skin and patch-test guidance · pregnancy or
breastfeeding referrals to a doctor · underarm and inner-thigh questions · live
tracking updates · label-created / awaiting-scan explanations · delivered-under-24-
hours instructions · requests for missing order information · website, TikTok, or
Amazon navigation instructions · Pro Partner and creator application information ·
subscription portal instructions

*Spam handling via approved email-provider controls is an **action**, not a reply —
see `inbox-triage.md`.*

## 5. Never tier 1 — always approval or human review

Refunds · replacements · cancellations · address changes · subscription charges
already processed · product reactions beyond mild irritation · chargeback or legal
threats · creator, affiliate, wholesale, or Pro Partner complaints · public
escalation threats · fraud concerns · high-value orders · customer-care exceptions ·
**anything the agent is not confident about**

---

## 6. Identity verification

### Low-risk order lookup
The agent may provide general tracking or order status when **one** of these matches:

- Sender's email matches the address on the order
- Exact order number **and** the name on the order
- Order number **and** delivery ZIP code

### Never disclose
Full shipping address · billing address · payment details · full customer history ·
another customer's orders · phone number · internal risk or fraud notes

**Never confirm an address by masking.** A masked ZIP reveals one of the accepted
verification factors. Instead, disclose nothing until verification passes:

> I have located an order that appears to match the information you provided.

Only after verification does the agent confirm anything.

### Address changes — require ALL
- Exact order number
- Full name on the order
- Email used for the order, **or** verification from that email account
- Complete corrected address supplied by the customer
- Confirmation the order has not entered fulfillment

When the customer writes from a **different** email address, never change the
address automatically.

> Hi [Name],
>
> I'm happy to check that for you.
>
> Since you're writing from a different email than the one attached to the order,
> please send the order number, full name on the order, and delivery ZIP code. Once
> I can match those details, I'll help with the next step.

### Refunds and cancellations from a different email — require
Exact order number **plus at least two** of: full name · delivery ZIP code · phone
number on the order · original purchasing email.

**Do not disclose which supplied detail was incorrect.**

---

## 7. Signature and sender identity

**The brand is Tamar. People buy from Tamar. The agent is an extension of Tamar,
not a fake employee.** Do **not** sign as "Customer Support."

```
Tamar
Founder, The Bikini Line Co.
```

Plus a disclosure footer:

> This email was prepared with the assistance of our support system.

**Applied to every agent-drafted email, including during probation** — not only to
auto-sent mail. If the footer appeared only on auto-sent replies, its *absence*
would implicitly claim Tamar personally wrote the others. Consistent disclosure
means the footer carries no hidden signal.

## 8. Category graduation

Auto-send unlocks **per category**, not globally. A single global threshold would be
satisfied almost entirely by shipping and product questions while the risky
categories go untested.

| Category | Auto-send after |
|---|---|
| Website navigation | 10 approvals |
| Amazon navigation | 10 approvals |
| General FAQ | 15 approvals |
| Product questions | 20 approvals |
| Shipping updates | 20 approvals |
| Tracking questions | 20 approvals |
| TikTok instructions | 20 approvals |
| Subscription questions | **Manual** |
| Refunds | **Manual** |
| Replacements | **Manual** |
| Reactions | **Manual** |
| Address changes | **Manual** |
| Creator / partner | **Manual** |
| Chargebacks | **Manual** |

The §3 quality gates still apply within each category.

## 9. Mail-loop protection

### Never reply when any of these are present
`Auto-Submitted` header · `Precedence: bulk` · `no-reply@` sender · Mail Delivery
Subsystem · out-of-office · vacation responder · automatic reply · `bounce@` ·
`postmaster@`

### Thread limits
- **Maximum 1 outbound agent reply per thread** until the *customer* replies
- **No more than 2 agent replies within 24 hours** without human review

> *"Human replies" is read as **the customer**, not Tamar — otherwise the agent
> could never hold a normal multi-turn support conversation.*

## 10. Audit trail

Every action leaves a breadcrumb:

```
Received → Classified → Retrieved KB → Retrieved Policy → Found Shopify Order
→ Drafted Reply → Requested Approval → Approved → Executed Refund
→ Confirmation Sent → Closed
```

Each entry records **the inputs, not just the step** — which KB file and version,
which config values, which order. Without version stamps, a reply cannot be
explained after the KB changes underneath it.

## 11. Every stop carries a reason

The agent never surfaces a bare "needs approval." It states why.

```
Needs approval because:
✓ Refund
✓ Money movement
✓ $54.99
✓ First refund
Confidence: high
```

```
Needs approval because:
Customer mentioned HS, pregnancy, reaction.
Medical discussion detected.
Confidence: low
```

---

## 8. TikTok notification emails

Operational alerts, **not** customer emails. The agent:

- Extracts any available order number, customer message, or refund request
- Creates a TikTok task
- Drafts a **chat-style** reply only when the actual customer message is included
- **Never** responds directly to the TikTok notification email
- **Never** uses an email signature in a TikTok draft

---

## 12. OPEN ISSUES

**A. Tier 1 and the confidence gate disagree about pregnancy.**
§4 lists *"pregnancy or breastfeeding referrals to a doctor"* as eventually
auto-sendable. But a pregnancy mention is exactly what §11's low-confidence example
escalates on. Two safety systems, opposite answers. **Proposed resolution:** any
medical or pregnancy mention escalates and never auto-sends, regardless of how
formulaic the referral answer is. Remove it from §4.

**B. Subscription questions appear in two tiers.**
§4 lists *"subscription portal instructions"* as tier 1; §8 marks *Subscription
questions* Manual. **Proposed resolution:** pure navigation ("here's where to log in
and cancel") is tier 1; anything referencing a charge, renewal, or refund is manual.

**C. Reaction boundary is undefined.**
§4 allows sensitive-skin and patch-test guidance to auto-send; §8 marks Reactions
manual. "My skin feels a little dry" vs "my skin is burning" is the line, and it
isn't drawn. **Proposed resolution:** any message reporting a *current* skin
symptom escalates; only forward-looking guidance ("will this irritate me?")
auto-sends.

**D. P0 escalation has a single point of failure.**
The reminder ladder (15 min → 1 hr → 4 hr → daily) repeats to the same person. Real
paging escalates to a *second* human. With one recipient, a chargeback deadline
passes if Tamar is unreachable. Also needs a snooze — an unacknowledged daily
reminder forever produces alert fatigue, which is how P0s start getting ignored.

**E. Effective auto-send bar is stricter than "95%".**
The six zero-tolerance gates in §3 already cover most of what "material error"
means, so the real bar is closer to *zero material errors* than to 95%.

**F. Confidence scoring — see §13.**

## 13. The Safety Engine

> **A model may never decide that it is safe. It may only decide that it is not
> safe.**

There is no "confidence score." Self-reported LLM confidence is not a probability —
a model writing "99%" is emitting a token. Models are most confident exactly when
they are wrong, so a gate keyed to self-assessment fails in the case it exists to
catch.

Instead every email receives a **Safety Score computed from deterministic checks**.
The LLM contributes nothing to it.

### Pipeline

```
Customer Email → Inbox Classification → Knowledge Retrieval → Policy Retrieval
→ Shopify Lookup (if applicable) → Safety Engine → Decision
```

### Four separate concepts

| Concept | Question |
|---|---|
| **Classification** | What is this? Support · invoice · spam · creator |
| **Safety** | Can this be handled automatically at all? Yes / no |
| **Authority** | Does the agent have permission? Draft · approve · execute · escalate |
| **Reason** | Why did it stop? *(explanation only — never a safety mechanism)* |

### Checklist

```
Identity   verified sender · order matched · no mismatch      PASS
Retrieval  KB retrieved · policy retrieved · score above bar  PASS
Category   Product Question                                    PASS
Medical    no trigger terms                                    PASS
Money      no refund · no cancellation · no replacement        PASS
Privacy    no address disclosure                               PASS
──────────────────────────────────────────────────────────────────
Result     Safe for Auto Send
```

The agent never reports a percentage. It reports which checks passed.

### Order matching — inspectable, not scored

```
Matched   Email ✓   Order Number ✓   ZIP ✓        → proceed
Matched   Email ✓   Name ✓           ZIP ✗        → manual review
```

### Retrieval — named sources, not scores

```
Retrieved   Product KB ✓   Shipping Policy ✓   Return Policy ✓
```

If a required source is not found → **manual**.

### Hard blocks — in code, no exceptions

Any of these present → **auto-send NO**:

`pregnant` · `pregnancy` · `breastfeeding` · `burning` · `rash` · `reaction` ·
`eczema` · `HS` · `hidradenitis` · `lawyer` · `attorney` · `chargeback` · `BBB` ·
`FDA` · `lawsuit` · `refund` · `replacement` · `cancel`

Plus these **derived-state** signals (not keywords — computed from order data):
sender email ≠ order email · requested shipping address ≠ order address · no order
match.

### The LLM's remaining job — explanation

```
Why I Stopped
Customer reported burning after use.
Medical trigger detected.
Current symptoms require manual review.
```

Useful for the human reading the queue. **Never** a safety mechanism.

## 14. OPEN — hard-block list refinements

**A. Intent vs. mention.** Keyword matching cannot distinguish *"what is your refund
policy?"* from *"I want a refund."* Both contain `refund`. Under the stated
principle the LLM may never unblock, so policy-explanation FAQs are permanently
manual. Correct, but worth knowing it is the consequence.

**B. Non-English mail bypasses every block.** The brand ships internationally. A
customer writing *"estoy embarazada"* matches no term in the list and sails through
every medical gate. Needs either language detection → manual, or translated term
lists.

**C. Substring matching will false-positive.** `HS` inside `months`, `washes`,
`highest`; `cancel` inside `cancellation policy`; `reaction` inside a quoted
marketing line. Requires word-boundary matching and case-sensitive handling for
acronyms.

**D. Terms missing from the list.** `allergic` · `allergy` · `swelling` · `blister`
· `infection` · `infected` · `hospital` · `dermatologist` · `sue` · `legal` ·
`unauthorized` · `didn't order` · `fraud`. The first six come from the
discontinue-use list in the product KB §15 and should not be absent here.

**E. Block rate is the metric to watch.** An over-broad list is *safe* but silently
defeats the graduation system — if most mail hits a hard block, tier 1 never
auto-sends and probation graduates a capability that never runs. **Measure the block
rate during probation.** If it is very high, the list needs narrowing, not the
thresholds.
