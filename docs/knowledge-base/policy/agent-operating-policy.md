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

Addresses may be confirmed only in **masked** form:

> I currently have the order shipping to an address ending in 30303.

Do not read the full address back unless the customer has already provided the same
address in the current conversation.

> ⚠️ **Open issue.** The masked example reveals the ZIP — which is itself one of the
> accepted verification factors. Mask on a detail that is *not* a verification
> factor (e.g. last two of the street number). See §9-A.

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

## 7. Signature and identity of the sender

> ⚠️ **Unresolved — see §9-B.** Approved replies currently sign as
> *"Tamar, Founder, The Bikini Line Co."* During probation every message is
> human-approved. After auto-send is enabled, mail signed by a named individual
> would go out without that person having seen it. Needs a decision before auto-send
> is turned on.

---

## 8. TikTok notification emails

Operational alerts, **not** customer emails. The agent:

- Extracts any available order number, customer message, or refund request
- Creates a TikTok task
- Drafts a **chat-style** reply only when the actual customer message is included
- **Never** responds directly to the TikTok notification email
- **Never** uses an email signature in a TikTok draft

---

## 9. OPEN ISSUES

**A. Masked address leaks a verification factor.**
§6 accepts "order number + delivery ZIP" as proof of identity, then masks addresses
by revealing the ZIP. Mask on a non-factor detail instead.

**B. Sender identity after auto-send.**
Replies sign as a named human. Once tier 1 auto-sends, that person hasn't seen the
message. Options: brand-level signature ("The Bikini Line Co. Support"), a named
support persona, or keep as-is and accept it.

**C. Probation sample coverage.**
50 replies will be dominated by common cases. Rare high-risk categories (reaction
reports, wrong-order matches, chargebacks) may appear **zero** times, so passing
probation proves competence on easy mail only. Consider **per-category** unlock —
a category auto-sends only after N approved drafts *in that category*.

**D. Mail-loop protection — undefined.**
No rule prevents the agent replying to auto-responders, no-reply addresses, or its
own thread repeatedly. Needs: never reply to `no-reply@`/auto-generated senders, and
never send more than N replies in one thread without human review.

**E. P0 notifications have no acknowledgment loop.**
§Priority in `inbox-triage.md` fires one instant Telegram message. If it isn't seen,
nothing follows. P0 should repeat or escalate until acknowledged.

**F. Effective auto-send bar is stricter than "95%".**
The six zero-tolerance gates in §3 already cover most of what "material error"
means, so the real bar is closer to *zero material errors* than to 95%. Worth
stating plainly so the threshold isn't misread as lenient.
