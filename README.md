# AjoFlow

AI-powered digital ROSCA (Rotating Savings and Credit Association) platform that digitizes traditional Nigerian "Ajo/Esusu" savings circles with trustless wallets and AI-based trust scoring.

**Sectors:** Payments (P) | Social Services (S) | Emerging Tech (AI)

## Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | [https://ajo-flow.vercel.app](https://ajo-flow.vercel.app) |
| **Backend API** | [https://enyata-interswitch-hackathon.onrender.com](https://enyata-interswitch-hackathon.onrender.com) |

### Test Credentials

After seeding the database, use any of these demo accounts:

| Email | Password |
|-------|----------|
| `amara@demo.com` | *2nuRZFFzwgawcEzo* |
| `bola@demo.com` | *(same password)* |
| `chidi@demo.com` | *(same password)* |
| `dami@demo.com` | *(same password)* |

**Amara** is the pod admin. The other three are members with varied payment histories for demonstrating AI trust scoring.

Or register a fresh account to test the full signup flow.

## Demo Walkthrough

1. **Signup** — register a new account (validates email, phone, password strength)
2. **Login** — sign in (JWT issued, silent refresh on reload)
3. **Create Pod + Wallet** — click "Create Pod" on the pods page, fill details + 4-digit wallet PIN → pod created, Interswitch wallet provisioned
4. **Contributions** — members contribute to the pod wallet; seed data includes on-time, late, and missed payments to show timing variety
5. **AI Evaluation** — admin navigates to manage page → "Run AI Evaluation" → DeepSeek AI scores all members → queue reorders (risky members pushed to end) → reasoning displayed per member
6. **Trust Score Contrast** — compare a prompt payer (score 80–100, position held) vs a delinquent payer (score <50, moved to queue end with reasoning)
7. **Manual Admin Funding** — admin records an offline/cash contribution for a member via the manage page (select member + cycle)
8. **Wallet Payout** — admin triggers payout → debt deducted for missed cycles → Interswitch disburses to first queue recipient's bank account
9. **Cycle Reset** — after all members paid out → admin resets → queue restored, new rotation begins
10. **Logout** — clears session, redirects to login

> **Shortcut:** Seed the database to skip steps 1–4 and jump straight to AI evaluation with pre-populated data.

## How It Works

### AI Trust Agent

AjoFlow's AI Trust Agent uses DeepSeek V3 (via LangChain) to score each member's reliability from 0–100. The agent considers:

- **Per-pod metrics** — on-time payments, late payments, missed payments, failed charges
- **Cross-pod platform history** — aggregate behaviour across all pods a member has joined
- **Queue context** — position, whether the member has already been paid out

Members with a trust score below 50 are flagged as risky and moved to the end of the payout queue. The AI provides transparent reasoning for every decision — visible to the admin in the UI.

### Interswitch Integration

Three API surfaces integrated:

1. **Wallet API** — pooled fund holding per pod (create wallet, check balance)
2. **Virtual Account Callback** — credits pod wallet when members send funds to the pod's Wema Bank virtual account
3. **Disbursement API** — lump-sum payout from pod wallet to recipient's bank account

### Contribution Timing

Contributions are classified at AI scoring time (not enforced at payment time):

- **On-time** — paid before or on the cycle due date → scored favourably
- **Late** — paid after the due date → penalised in trust score
- **Missed** — no payment recorded → heaviest penalty + debt deducted from payout

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT (short-lived access token in memory + HttpOnly refresh cookie) |
| Payments | Interswitch Wallet, Virtual Account, Disbursement APIs |
| AI | LangChain + DeepSeek V3 (structured output via Zod) |
| Runtime | Bun |
| Hosting | Vercel (frontend) + Render (backend) |

## Local Development

Requires [Bun](https://bun.sh) installed.

```bash
# Install all dependencies
bun run install:all

# Copy env and fill in values
cp server/.env.example server/.env

# Run backend (port 4000)
bun run dev:server

# Run frontend (port 3000)
bun run dev:client
```

### Seed the database

```bash
curl -X POST http://localhost:4000/api/seed \
  -H "x-seed-secret: <SEED_SECRET from .env>"
```

## Project Structure

```bash
ajo_flow/
├── client/          Next.js 16 frontend (App Router)
│   ├── app/
│   │   ├── (auth)/        Login, Register
│   │   ├── (public)/      Landing, Pod browser, Pod detail
│   │   └── (protected)/   Dashboard, My Pods, Manage, Settings
│   ├── components/
│   ├── contexts/          AuthContext (silent refresh)
│   └── lib/               API client, auth helpers, fetchers
├── server/          Node/Express TypeScript backend
│   ├── src/
│   │   ├── models/        User, Pod, Transaction, TrustScore
│   │   ├── routes/        auth, pods, payments, trust, stats, cron, seed
│   │   ├── services/      interswitch, trustAgent, queueService, payoutService, contributionService
│   │   └── middleware/    JWT auth
│   └── .env.example
└── docs/            Architecture and planning docs
```

## Team

Built for the Interswitch x Enyata Hackathon (March, 2026).

- **Jedidiah Amaraegbu** — Development (frontend, backend, AI integration)
- **Esther Inyang** — Communications, Interswitch API integration testing and feedback
