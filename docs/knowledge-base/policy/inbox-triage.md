# Inbox Triage Policy

**Domain:** Policy (routing)
**Version:** 1.0
**Last updated:** 2026-08-06

---

## 0. Canonical first-step rule

> Before responding to any inbound email, classify it by **category, priority,
> owner, and required action**. Do not assume every message sent to `hello@` is
> customer support.
>
> Customer emails enter the support workflow. Important operational emails enter the
> OS and notify Tamar based on priority. Cold outreach is archived or safely
> unsubscribed. Spam and phishing are never replied to or opened. Platform alerts
> create tasks rather than receiving direct replies.

**Classification happens before the agent searches Shopify, drafts a reply, clicks
anything, or notifies anyone.** Think of it as an inbox router sitting in front of
the support agent.

## 1. Assessment order

1. Is it customer support?
2. Is it a business or operational email?
3. Is it a platform notification?
4. Is it a partner, creator, press, or sales inquiry?
5. Is it spam, phishing, or cold outreach?
6. Does it require Tamar's attention?
7. Is it urgent?

The agent assigns: **category · priority · owner · recommended action · reply
needed? · Telegram needed? · add to OS?**

---

## 2. Categories

### 2.1 Customer support
Where is my order · missing package · damaged bottle · refund request · subscription
issue · product question · reaction · address change · cancellation

**Action:** enter the support workflow · search Shopify when appropriate · draft or
send per current approval level · add the case to the support OS · notify only when
approval or escalation is required.

**Telegram only for:** refund approval · replacement approval · serious reaction ·
chargeback · legal threat · high-risk or unclear case.

> **Routine support does not ping you.**

### 2.2 Important business operations
Supplier invoice · manufacturer communication · fulfillment issue · accountant
request · banking or payment notice · insurance · contract update · tax document ·
software renewal · inventory warning · vendor shipment · compliance request

**Action:** never reply automatically · add to OS under Business Operations ·
extract sender, company, subject, amount, due date, requested action, attachments ·
draft a reply only when the situation is clear · wait for approval before sending.

**Notify immediately when:** payment due within 3 business days · account may be
suspended · inventory or fulfillment affected · contract or legal deadline exists ·
amount above configured threshold · sender marks it urgent · appears important but
ownership is unclear.

```
Invoice needs review
Vendor: ABC Packaging
Amount: $2,480
Due: August 10
Invoice: Attached
Requested action: Payment confirmation
Draft reply: Ready
[Open in OS] [Draft Reply] [Mark Reviewed]
```

### 2.3 Legal, financial, security, compliance
Chargeback notice · legal demand · trademark issue · tax notice · bank alert ·
Shopify account restriction · data privacy request · password or login warning ·
suspicious account access · government correspondence

**Action:** never reply automatically · **never click links unless independently
verified** · preserve email and attachments · add to OS as Urgent Review · notify
immediately · draft only if requested.

**Telegram: always immediate.**

```
URGENT BUSINESS EMAIL
Type: Shopify account warning
Sender: [Sender]
Deadline: [Date]
Summary: [One concise paragraph]
Links opened: No
Reply sent: No
[Open Email] [Open OS Record] [Mark Safe]
```

### 2.4 Platform notifications
TikTok Shop unread-message alert · TikTok refund request · Shopify risk notification
· Amazon order issue · subscription payment failure · shipping exception · app
billing notice

**Never reply to the notification email itself.** Instead: identify the platform ·
extract order number, customer message, deadline, requested action · create the OS
task · draft the customer reply only when the actual customer message is included ·
route to the correct queue (TikTok Review · Refund Approval · Shipping Exception ·
Platform Operations).

A TikTok unread-message alert can wait for a digest. A TikTok refund deadline or
Shopify account issue triggers immediate notification.

### 2.5 Pro Partner, creator, press, collaboration

| Type | Route | Notes |
|---|---|---|
| Pro Partner inquiry | partners.thebikiniline.co · partners@thebikiniline.co | Routine questions may receive the approved answer. **Active partner complaints escalate.** |
| Creator / affiliate | creators@thebikiniline.co | May acknowledge and request social links or portfolio. **Never** promise a partnership, rate, product shipment, or approval. |
| Press / media | OS → Press and Opportunities | Do not answer substantively. Notify. |

**Notify for:** recognizable publication · podcast or interview request · major
creator · retail opportunity · time-sensitive collaboration · active partner
complaint. Routine UGC pitches go to a digest or the creator queue without
interrupting.

### 2.6 Job applications
Add to Hiring queue if actively hiring; otherwise archive under Hiring or send a
simple approved acknowledgment. **Never promise an interview.** Do not notify for
every application.

**Notify only when:** the role is open · the applicant was referred · the
application is unusually strong · Tamar has asked to review all applicants.

### 2.7 Legitimate mailing lists
Software/vendor newsletters · industry updates · marketing from previously
subscribed brands.

Unsubscribe **only** through: the provider's built-in unsubscribe control · a
verified `List-Unsubscribe` header · a known, trusted sender.

**Never click unsubscribe links inside suspicious messages.**

### 2.8 Cold outreach
SEO pitches · web development offers · agency solicitations · lead-gen services ·
packaging sales · "quick question" sequences · generic partnership offers · podcast
booking spam

**Default:** mark as cold outreach · archive · unsubscribe via trusted control when
available · do not reply · do not notify · record sender/domain only if repeated
outreach becomes a problem.

> The agent does not spend time drafting polite declines for routine cold email.

**Exception —** credible retail opportunity · major publication · established
manufacturer · strategic distribution partner · recognizable creator or brand →
move to **Business Opportunity Review** rather than discarding.

### 2.9 Spam and phishing
Fake invoices · password requests · crypto offers · gift-card requests · suspicious
attachments · fake Shopify notices · login links from unknown domains · credential
requests

**Action:** mark as spam or phishing · do not reply · **do not unsubscribe through a
message link** · do not open attachments · do not enter credentials · do not forward
externally.

**Notify only if** it imitates a vendor, Shopify, Amazon, TikTok, a bank, or another
important account.

---

## 3. Priority levels

| Level | Behavior | Examples |
|---|---|---|
| **P0 — Immediate** | Telegram instantly | Legal threat · severe customer reaction · chargeback deadline · security issue · account suspension risk · government or bank notice · fulfillment outage · major press issue |
| **P1 — Same day** | OS + Telegram | Invoice due soon · supplier issue · important partnership · refund needing approval · replacement needing approval · subscription payment dispute · creator or partner complaint |
| **P2 — Routine** | OS, no immediate alert; included in morning/evening digest | Normal customer support · creator inquiry · routine invoice with future due date · TikTok unread alert · job application |
| **P3 — Archive** | No notification | Spam · cold outreach · irrelevant newsletters · automated marketing · duplicate notifications |

---

## 4. What goes into the OS

Every important non-spam email creates a card containing:

sender · company or customer · category · priority · subject · short summary ·
requested action · deadline · order number (when applicable) · financial amount
(when applicable) · attachments · draft reply status · owner · current status ·
Telegram notification status · link to the original email

### Queues
Customer Support · Waiting for Founder Approval · TikTok Review · Refunds and
Replacements · Business Operations · Invoices and Payments · Suppliers and
Fulfillment · Press and Opportunities · Creators and Partners · Legal and Compliance
· Hiring · Waiting for Reply · Completed · Spam and Archived

---

## 5. Founder notification style

The agent does **not** ask *"Do you want to respond?"* without context. It states
what it found, what it did, and what remains.

> This appears to be an invoice from ABC Packaging for $2,480, due August 10. I
> added it to Business Operations and prepared a short acknowledgment. No reply has
> been sent.

`[Review Invoice] [Approve Draft] [Assign] [Mark Paid] [Archive]`

> This appears to be a legitimate podcast invitation from [Company]. They're
> requesting a response by Friday. I added it to Press and Opportunities and drafted
> a reply.

`[Open] [Approve Draft] [Decline] [Remind Tomorrow]`

---

## 6. No order found under the sender's email

1. Search for an order number included in the message
2. Search by customer name **only as discovery**, never as proof of identity
3. Ask which channel they ordered through
4. Ask for: exact order number · email used at checkout · full name · delivery ZIP
5. **Do not** reveal an address or order history
6. **Do not** change an address, refund, or cancel until verified

**Do not state that no order exists** until the channel and identifying information
are confirmed.

> Hi [Name],
>
> I'd be happy to look into this.
>
> I wasn't able to find an order under the email you're writing from. Can you send
> me your order number, the email used at checkout, and the delivery ZIP code?
>
> Also let me know whether you ordered through our website, TikTok Shop, or Amazon.
> Once I have that, I'll get you the right update.

---

## 7. Disposal hierarchy — archive is the default, not spam

Spam-marking is the **only silently destructive action** in this policy. It trains
the provider filter, so a wrongly-marked supplier disappears from future inboxes and
nobody notices until an invoice goes unpaid.

```
Archive  →  Unsubscribe (safe)  →  Spam  →  Delete
```

Spam requires **confidence**. When unsure → **archive**, never spam.

### Never spam-mark
Existing customer · vendor · creator · partner · any domain we have replied to ·
domain in contacts · domain in Shopify · domain in Notion · domain in previous
conversations

*Unsubscribing is itself an outbound signal — it confirms the address is live. Safe
for legitimate lists via `List-Unsubscribe`; remains prohibited for suspicious mail.*

## 8. P0 acknowledgment ladder

P0 repeats until acknowledged:

```
Telegram → 15 min → 1 hr → 4 hr → daily → until acknowledged
```

On acknowledgment, reminders stop.

> ⚠️ **Open —** the ladder repeats to a single recipient, so an unreachable founder
> means a missed deadline regardless. Needs either a second escalation contact or
> explicit acceptance of the risk, plus a snooze control to prevent alert fatigue.
> Tracked in `agent-operating-policy.md` §12-D.
