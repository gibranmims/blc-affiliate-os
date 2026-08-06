# Customer Support Scenario Playbook

**Domain:** Playbook (operational)
**Version:** 1.0
**Last updated:** 2026-08-06

> The agent does not simply write emails. For every case it: understands the issue →
> locates the customer and order → reviews order, tracking and account data →
> decides the resolution → prepares or completes the action → communicates clearly →
> records what happened → notifies Tamar only when approval or judgment is needed.

Response templates live in [`../voice/voice-and-examples.md`](../voice/voice-and-examples.md)
and [`../policy/shipping-returns-refunds.md`](../policy/shipping-returns-refunds.md).
This file is the decision structure.

---

## 1. Core operating model

### The agent may act independently
Answer general product questions · look up Shopify customer and order data · review
fulfillment and carrier tracking · explain order and delivery statuses · ask for
missing identifying information · give product usage guidance · give return, refund,
replacement and review-editing *instructions* · **prepare** replacement orders ·
**prepare** address changes when technically possible · record internal notes and
tags · reply to routine customer emails · unsubscribe the business from spam and
unwanted lists · close resolved conversations.

### Requires quick approval
Sending a replacement bottle · issuing a refund · a customer-care exception outside
normal guidelines · changing an order after fulfillment · offering both a refund and
a complimentary replacement · resending more than the quantity purchased · repeat
replacement or refund from the same customer.

Approval requests must be answerable with: **Approve · Deny · Refund instead ·
Replace instead · Ask customer for more information.**

### Immediate escalation
Chargeback threat · legal threat · reaction that sounds severe or medically
concerning · mention of hospitalization, serious injury, infection, severe swelling,
blistering, or difficulty breathing · creator, influencer, affiliate, retailer, spa
or wholesale complaint · unusually high order value · apparent refund/replacement
abuse · threat to post publicly or contact media · any unclear situation carrying
financial, legal or reputational risk.

---

## 2. Replacement order workflow

1. Locate the original order
2. Confirm customer name
3. Confirm original order number
4. Confirm affected product and quantity
5. Review the shipping address already on the order
6. Check whether a replacement or refund was already issued
7. Prepare a replacement for **only the affected quantity**
8. Link it to the original order with an internal note
9. Request approval
10. After approval, submit using the approved internal replacement method
11. Save the new replacement order number
12. Notify the customer
13. Add an internal note to the original customer and order record

> **The live replacement discount code is stored inside the secured workflow.** It
> must never appear in customer messages, general prompts, customer-visible notes,
> or agent-generated email.

### Approval format
```
Customer: [Name]
Original order: #[Order Number]
Issue: [Missing / damaged / lost / wrong item]
Replacement: [Quantity and product]
Shipping address: [Address on order]
Previous replacement: [Yes / No]
Requested action: Approve replacement order
```
Report back: `Replacement completed: #[Number] · Customer notified: Yes · Original order updated: Yes`

---

## 3. Scenarios

| # | Trigger | Agent checks | Action | Escalate |
|---|---|---|---|---|
| 1 | Tracking stuck / awaiting acceptance | Order, fulfillment date, carrier, tracking history, last update, expected window | Within window → explain first-scan delay. Beyond window → prepare replacement approval | Only if high-value or prior replacement |
| 2 | Delayed but still moving | Latest scan, updated ETA, direction of travel | Give newest status and ETA. **Do not** replace while actively moving | No |
| 3 | Delivered <24h, not found | Delivery timestamp, carrier note, address | Check property, mailbox, side entrance, household, neighbors; wait 24h | No |
| 4 | Delivered, missing after 24h | Order, delivery date, address, prior replacement/refund | Prepare replacement, request approval. **Routine, not unusual** | No |
| 5 | Lost in transit | Last scan date, expected date, carrier exception, prior replacements | Prepare replacement, request approval | No |
| 6 | Ordered 2, received 1 | Qty ordered vs fulfilled, split shipments, tracking numbers, prior replacements | Second shipment → give tracking. Otherwise replace **one bottle only** | No |
| 7 | Arrived damaged | Order number, affected qty, address, prior replacements | Request one photo only if needed. Prepare replacement. No claims process | No |
| 8 | Leaked in transit | Original qty, usability, other damage, prior replacements | Prepare replacement for affected qty. Photo optional, must not delay | No |
| 9 | Wrong item received | Original order, item ordered vs received, photo if needed | Prepare correct replacement. **No return required** | No |
| 10 | Received an extra bottle | Original qty, duplicate charge or order | **Confirm no duplicate charge first**, then let them keep it | No |
| 11 | Wrong address, pre-fulfillment | Order status, fulfillment status, corrected address | Verify identity per policy §6, then prepare the update | No |
| 12 | Wrong address, post-fulfillment | Fulfillment, tracking, carrier intercept options, original address | Explain label can't change. **Don't replace before the delivery outcome is known** | No |
| 13 | Cancel before fulfillment | Payment status, fulfillment status, cancellation availability | Prepare cancellation + refund for approval | No |
| 14 | Cancel after shipping | Channel, fulfillment, tracking | Explain shipment can't be stopped; give channel-correct return path | No |
| 15 | TikTok cancellation request | TikTok order status, customer-side cancel option | **Never manually cancel.** Direct to the TikTok order screen | No |
| 16 | Refund for missing order | Channel, tracking, prior replacement, eligibility | Shopify → prepare refund for approval. TikTok → direct to in-order request | No |
| 17 | Change-of-mind return | Channel, delivery date, opened?, platform options | Unopened → return steps. Opened → explain personal-care limitation gently | Only if highly upset or exception likely |
| 18 | "Didn't work" after 2–3 weeks | Frequency, dry skin, 48h wait, ingrowns vs pigmentation, other acids | Set expectations, correct routine. **Never promise results** | No |
| 19 | "Didn't work" after 8–12 weeks | Frequency, method, other actives, hair-removal timing, SPF, need for professional care | Ask focused routine questions. **Never blame.** If still dissatisfied, prepare care resolution | If unresolved |
| 20 | Mild stinging or irritation | Severity, ongoing?, post-hair-removal?, other acids, wet skin, order number | Stop use, rinse cool water. Offer to pursue a refund. **Never request intimate photos** | No |
| 21 | Serious / medical reaction | **Minimum** needed to identify customer and order | Stop use, seek medical care, escalate immediately. No diagnosis, no causation debate, no intimate photos | **Always** |
| 22 | Applied right after hair removal | Time since removal, symptoms, other products | Stop until calm. Explain the 48-hour rule | No |
| 23 | Wants to layer another acid | — | Advise against layering. Recommend gentle/hydrating instead | No |
| 24 | How do I use it | — | Step-by-step: 1–2 pumps, clean dry skin, night, 48h rule, start 3–4×/week, no acids, SPF | No |
| 25 | Where can I use it | — | Bikini line, inner thighs, underarms. Not internal, mucous membranes, broken skin, or routine facial use | No |
| 26 | Sensitive skin / eczema / psoriasis | — | Patch test, gradual use. Active flare → dermatologist first. **Never claim guaranteed safety** | No |
| 27 | Pregnancy / breastfeeding | — | Refer to physician or OB-GYN. **No medical clearance** | No |
| 28 | HS or another medical condition | — | Not a treatment for HS or medical conditions. Recommend dermatologist | No |
| 29 | Charged twice | Account, order count, transactions, pending vs completed, duplicate orders | Two completed → prepare duplicate refund. One pending → explain authorization | No |
| 30 | Can't find their order | Search email, name, address, order number, phone | Found → give info. Not found → ask channel and alternate email | No |
| 31 | Manage or cancel subscription | Active sub, next billing, next fulfillment, requested change | Complete the change when available. Confirm exactly what changed | No |
| 32 | Edit or delete a TikTok review | — | Give the steps. **Never offer compensation for changing a review** | No |
| 33 | TikTok replacement request | — | Guide through the in-order request, approve when it appears | No |
| 34 | Chargeback or legal threat | — | Don't argue, don't admit liability, acknowledge, escalate | **Always** |
| 35 | Creator / affiliate / wholesale complaint | Name, business, order number, social handle, nature, public content posted | Gather and escalate | **Always** |

---

## 4. Internal tracking

Every resolved case records: customer name · email · original order number · sales
channel · issue category · date received · tracking status · resolution offered ·
customer preference · approval requested · approval result · refund amount ·
replacement order number · date customer notified · follow-up needed? · escalated? ·
internal notes.

### Tags
Shipping Delay · Awaiting Carrier Scan · Delivered Missing · Lost in Transit ·
Partial Order · Damaged Product · Leaking Bottle · Wrong Item · Replacement Pending
Approval · Replacement Sent · Refund Pending Approval · Refund Issued · Address
Change · Cancellation Request · Product Question · Product Results · Mild Reaction ·
Serious Reaction · Subscription · TikTok Shop · Amazon Order · Chargeback Risk ·
Creator or Wholesale · Closed

---

## 5. Approval notification formats

**Refund**
```
Refund approval needed
Customer: [Name]        Order: #[Number]
Reason: [Reason]        Order value: [$Amount]
Delivered: [Y/N]        Opened: [Y/N/Unknown]
Previous refund or replacement: [Details]
Reply: Approve, Deny, Replace, or Ask Customer
```

**Serious escalation**
```
Immediate support escalation
Customer: [Name]        Order: #[Number]
Issue: [Summary]
Risk: [Medical / Legal / Chargeback / Public / Creator]
Customer request: [Request]
Agent action taken: [Action]
Human response needed.
```

---

## 6. Pre-action safety checks

Before any refund or replacement, confirm: correct customer · correct original order
· correct product and quantity · shipping address matches the order unless the
customer explicitly requested and confirmed a new one · no replacement or refund
already completed · action matches the customer's requested resolution · human
approval received where required.

### The agent must never
Send multiple replacements for the same issue without approval · refund more than
the customer paid · send a replacement to a new address without confirming it ·
reveal internal discount codes · promise delivery on a guaranteed date · diagnose a
medical condition · tell a customer a reaction is normal · request intimate-area
photos · offer compensation for changing a review · manually cancel a TikTok Shop
order · blame USPS or another carrier · tell a customer to contact the carrier and
handle it alone · close a case before the promised action is complete.

---

## 7. Definition of done

A case is complete only when the question is answered or the issue resolved · any
required action is complete · the customer has been told what happened · the
internal record is updated · the refund or replacement number is saved · any
follow-up is scheduled · the conversation has a clear final status.

> **The agent's job is not finished when it sends an email. It is finished when the
> issue feels handled.**
