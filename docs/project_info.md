# Project Info

## Project Name

AjoFlow

## Description

### Short Description

AjoFlow is an AI-powered, tax-compliant digital wallet that secures Africa’s traditional "Ajoo/Esusu" (rotating savings) system.
Built on Interswitch's Payment and Wallet infrastructure, AjoFlow solves the massive "trust deficit" in informal savings by holding pooled funds in a secure, automated wallet rather than a vulnerable individual's bank account.

Capitalizing on the January 2026 Nigeria Tax Acts, AjoFlow automatically classifies savings pods as micro-cooperatives, legally shielding users(like gig workers and market traders) from aggressive individual income taxes on their pooled payouts.
Furthermore, our integrated AI Trust Agent analyses contribution habits to generate a dynamic credit score, actively preventing defaults and placing high-risk members at the back of the payout queue.

We are digitizing trust for the unbanked.

### **Long Description (For your GitHub README & Demo Day Pitch)**

#### The Problem

For decades, millions of Nigerians have relied on traditional "Ajoo" or "Esusu" to fund major life events, buy vehicles, or pay school fees.
However, this system is deeply flawed:

1. **The Trust Deficit:** The administrator holding the funds can abscond with the money.
2. **The Default Risk:** Members who collect their lump sum early often default on their remaining contributions, collapsing the pool.
3. **The 2026 Tax Threat:** With the new aggressive tax monitoring on individual bank inflows introduced in January 2026, receiving a massive ₦2,000,000 Ajoo payout into a personal account flags the user for heavy income tax, even though it is pooled savings.

#### The Solution

AjoFlow (by Team Aestart) digitizes and secures the entire ROSCA (Rotating Savings and Credit Association) lifecycle.
We leverage the specific legal loophole in the 2026 Tax Act that completely exempts registered cooperative societies from these inflow taxes.

#### How it Works (The Tech Stack)

* **Automated Pay-Ins (Interswitch WebPAY):** Members' daily/weekly contributions can be automatically deducted via their linked cards, removing human friction.
* **Trustless Wallet (Interswitch Wallet APIs):** The money never touches the group admin’s personal bank account. It sits safely in an Interswitch-powered holding wallet.
* **Automated Payouts (Interswitch Disbursement API):** At the end of the cycle, the exact lump sum is automatically routed to the correct recipient's bank account.
* **Emerging Tech (AI Trust Scoring):** Our AI Agent monitors contribution velocity and frequency. If a user has a history of late payments, the AI dynamically adjusts the payout roster, moving them to the last slot to protect the rest of the pool from early-default risk.

**Sectors Addressed:** Payments (P), Social Services (S), Emerging Tech (AI).

## Pitch

We are Team Aestart.
In 2017, our lead engineer wrote a document predicting a tax shift in 2026 that would favour digital cooperatives.
Today, we are bringing that 9-year-old vision to life.

In January 2026, Nigeria's new tax laws took effect, heavily scrutinizing individual bank inflows and applying progressive taxes.
However, the law explicitly exempts registered cooperative societies.

We built an Online Ajoo that automatically registers informal savings pools as micro-cooperatives.
This allows any group(e.g: gig workers and market women) to pool billions of Naira legally, transparently, and 100% tax-free, solving the trust issue of traditional Esusu.

## The InterSwitch API Integration (The Tech)

1. Pay-In (WebPAY API)
    * [Add notes for manual payments for users that don't want to automate it]
    * Users can also automate their daily/weekly ₦2,000 Ajoo contributions using Interswitch's recurring card debits.
2. Holding (Wallet API): The pooled funds sit securely in an Interswitch-powered wallet, removing the risk of the "Ajoo administrator" running away with the money.
3. Pay-Out (Disbursement API): At the end of the month, the system automatically routes the lump sum to the bank account of the member whose turn it is.

## Emerging Tech Hackathon Criteria: AI Credit Scoring Agent

In traditional Ajoo, someone always defaults. Your AI agent analyses a user's on-time contribution history and assigns them a "Trust Score."
If a user has a low Trust Score, the AI automatically places them at the back of the payout queue, protecting the rest of the pool.
