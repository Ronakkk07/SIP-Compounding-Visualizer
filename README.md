# FinSight — SIP Compounding Visualizer

See exactly when your SIP will earn more money than you contribute. FinSight turns your investment history into a personal compounding story — with stages, milestones, age markers, and the precise crossover moment when your money starts working harder than you do.

---

## Using the App

### Profile (top-right → Profile button)

Before exploring any page, set up your profile. This anchors all projections to your real numbers.

| Field | What to enter |
|---|---|
| **Birth Year** | Used to show your age at every milestone |
| **SIP Phases** | Each period where your monthly SIP was a consistent amount. Add one phase per SIP level (e.g. ₹2K from Jan 2023, ₹5K from Jun 2023). Click **+ Add Phase** for each step-up. |
| **Import from CAS** | Paste your CAMS/KFintech statement text to auto-fill all phases — see [Getting Your Data](#getting-your-data) |
| **Current Corpus** | Your portfolio value as of today (or your last check) |
| **Total Invested** | Total SIP amount deposited till date |
| **Historical XIRR** | Your actual annualised return so far (check on Kuvera / Groww) |
| **Projected XIRR** | Expected future return — 12% is a reasonable long-term equity assumption |

Click **Save & Apply** — every page updates immediately.

---

### My Journey

Your complete SIP story in one view.

- **4 metric cards** at the top — corpus, invested, total returns, and XIRR
- **Corpus Growth chart** — area chart of corpus vs invested over time. Dotted vertical lines mark each SIP phase step-up with the new amount labelled.
- **Phase grid** — compact cards for each of your SIP phases with start date and monthly amount

> X-axis shows roughly yearly labels. Hover any point on the chart to see exact month values.

---

### Compounding Arc

The five stages every long-term SIP investor passes through — with your specific dates and ages.

| Stage | What it means |
|---|---|
| **Quiet** | Returns barely visible. Contributions dominate. Most people quit here. |
| **Snowball** | Corpus visibly accelerating. Returns becoming meaningful. |
| **Crossover** | Annual returns now exceed annual SIP. Market adds more than you do. |
| **Acceleration** | Returns are 2× your annual SIP. Stopping contributions wouldn't stop growth. |
| **₹1 Crore** | The corpus itself is a wealth engine. |

Each card shows the year, your age, corpus, and annual returns at that stage.

**LTCG Impact toggle** (top-right of the page) — shows post-tax corpus estimates for each stage assuming 12.5% LTCG on annual gains above ₹1.25L (Budget 2024 rules). This is a simplified conservative estimate; actual LTCG depends on individual unit holding periods.

---

### Strategy Simulator

Compare three projection strategies side-by-side:

- **Conservative** (8% XIRR) — bear market / low-return scenario
- **Base** (your projected XIRR) — your current assumption
- **Aggressive** (15% XIRR) — bull market scenario

Shows corpus at every 5-year interval and key milestones for each strategy.

---

### What-If Explorer

Add up to 4 custom scenarios and see how each one shifts your five compounding stages.

**Quick scenarios** — one-click chips:
- Started 1/2/3 years earlier
- Lump sum injection (₹25K / ₹50K / ₹1L)
- Higher/lower future SIP
- 10% or 15% annual step-up SIP (compounds your SIP amount every year)
- Different XIRR (bear/bull/worst-case)
- SIP pause (6 months or 1 year)

**Custom builder** — build any scenario: change SIP from any phase, inject lump sum in any month/year, adjust XIRR, pause for any duration.

Results show:
- **Arc chart** with stage markers for each scenario
- **Stage comparison table** — exact year and age for each stage, with year delta vs base
- **Delta cards** — corpus difference at 2042, crossover shift, ₹1Cr shift

---

### Milestones

Goal-based planning with SIP recommendations.

- Set financial goals with a target amount and target year
- FinSight calculates whether you're on track and by how much
- If behind, a binary search finds the **minimum extra monthly SIP** needed to hit the goal on time
- Shows ETA and your age when goal is reached
- Five default goals (Emergency Fund, Car, Education, Home Down Payment, ₹1 Crore) — edit or delete any

Below the goals is a compact **compounding stages overview** — a quick-read version of your five stages with year, age, and corpus.

---

### AI Coach (sparkle button, bottom-right corner)

A Llama 3.1 powered coach that knows your portfolio context. Ask anything:

- "When is my crossover year?"
- "How much extra SIP to reach ₹1Cr by 40?"
- "What happens if I pause SIP for 6 months?"
- "How does a 10% annual step-up change my arc?"

Requires a Groq API key (free) — see [Setup](#setup) below.

---

## Getting Your Data

You don't need to enter anything manually. Here's how to get your real numbers in 2 minutes.

### Option 1 — CAMS Email Statement (recommended, covers all AMCs)

1. Send an email from your **registered email address** to `cas@camsonline.com`
2. Subject: `CAS` (just that word, nothing else)
3. CAMS replies within minutes with a password-protected PDF
4. Open the PDF → password is your **PAN in uppercase + date of birth (DDMMYYYY)** e.g. `ABCDE1234F01012000`
5. Select all text in the PDF → Copy → Paste into FinSight's Profile → **Import from CAS Statement**

### Option 2 — MFCentral (all funds, all AMCs)

1. Go to [mfcentral.com](https://www.mfcentral.com)
2. Login → My Account → Consolidated Account Statement
3. Download → open → copy text → paste into import wizard

### Option 3 — Platform CSV exports

| Platform | Path |
|---|---|
| **Kuvera** | Reports → All Transactions → Export CSV |
| **Groww** | Portfolio → Mutual Funds → Reports → Download |
| **Zerodha Coin** | Console → Reports → Tradebook → Mutual Funds → Download |
| **Paytm Money** | Statements → Transaction History → Export |

Upload or paste the CSV into the import wizard. The parser auto-detects phases based on when your monthly SIP amount changed.

### What the import extracts

- All SIP transaction dates and amounts
- Phase boundaries (when your monthly amount changed by more than 8%)
- Total invested amount
- Closing portfolio value (corpus) from the statement date

After import, review the detected phases and click **Apply Phases**, then **Save & Apply** in Profile.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Vite](https://vitejs.dev) + [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) + CSS Custom Properties (full dark/light theming) |
| Charts | [Recharts](https://recharts.org) — AreaChart, ComposedChart, ReferenceLine, ReferenceDot |
| Auth + Database | [Supabase](https://supabase.com) — email/password auth, Postgres for settings sync |
| AI Coach | [Groq API](https://console.groq.com) — Llama 3.1 8B Instant (free tier) |
| Simulation engine | Custom TypeScript (`src/utils/financialCalc.ts`) — month-by-month SIP simulation anchored to real corpus reference |
| CAS parser | Custom TypeScript (`src/utils/casParser.ts`) — parses CAMS/KFintech text and CSV formats |
| Tax calculator | Custom TypeScript (`src/utils/taxCalc.ts`) — LTCG 12.5% post-Budget 2024 |
| State | React Context + localStorage (offline-first, syncs to Supabase when logged in) |

### Key simulation details

- Simulation runs **month by month** from your first SIP date to 2042
- **Anchored** at your real corpus snapshot (May 2026 in the default data) — projections extend forward from verified real data, not from a guessed starting point
- Historical months use your actual XIRR; projected months use your configured projected XIRR
- Crossover detection scans for the exact month when `annualReturns > annualSIP`
- Step-up SIP compounds the base phase amount by `(1 + stepUp%)^years` each year from SIP start
- Goal binary search uses 28-iteration bisection — accurate to ₹1

---

## Setup — Clone and Run Locally

### Prerequisites

- Node.js 18 or later
- A [Supabase](https://supabase.com) account (free)
- A [Groq](https://console.groq.com) account (free, for AI Coach)

### 1. Clone and install

```bash
git clone https://github.com/your-username/finsight.git
cd finsight
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. **Project Settings → API** → copy **Project URL** and **Publishable (anon) key**
3. Go to **SQL Editor** → paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql)
4. That's it — email/password auth is enabled by default

### 3. Get a Groq API key

1. Go to [console.groq.com](https://console.groq.com) → sign up (free, no card)
2. API Keys → Create API Key → copy the `gsk_` key

### 4. Configure environment

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key-here
VITE_GROQ_KEY=gsk_your-groq-key-here
```

> `.env.local` is in `.gitignore` — your keys are never committed.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 6. First run

- The app works without Supabase configured (data saves to localStorage only)
- Without Groq key, the AI Coach prompts you to add one
- Go to **Profile → Your SIP Journey** and either enter your phases manually or use **Import from CAS Statement**

### Build for production

```bash
npm run build
npm run preview
```

Output is in `dist/` — deploy to Vercel, Netlify, or any static host.

---

## Project Structure

```
src/
├── components/
│   ├── AICoachPanel.tsx     # Floating AI chat panel
│   ├── AuthScreen.tsx       # Login / signup screen
│   ├── ImportWizard.tsx     # CAS statement import flow
│   ├── MetricCard.tsx       # Reusable stat card
│   ├── Nav.tsx              # Top navigation
│   └── SettingsModal.tsx    # Profile / settings drawer
├── context/
│   ├── AuthContext.tsx      # Supabase auth state
│   ├── ThemeContext.tsx     # Dark / light mode toggle
│   └── UserSettingsContext.tsx  # Settings state + cloud sync
├── hooks/
│   └── useSimulate.ts       # Simulation hook (settings-aware)
├── pages/
│   ├── CompoundingArc.tsx
│   ├── MilestoneTracker.tsx
│   ├── MyJourney.tsx
│   ├── StrategySimulator.tsx
│   └── WhatIfExplorer.tsx
├── utils/
│   ├── aiCoach.ts           # Groq API integration
│   ├── casParser.ts         # CAS / CSV statement parser
│   ├── financialCalc.ts     # Core simulation engine + stage detection
│   └── taxCalc.ts           # LTCG post-tax calculation
├── data/
│   └── sipData.ts           # Default seed phases + reference data
└── lib/
    └── supabase.ts          # Supabase client (null-safe if unconfigured)

supabase/
└── schema.sql               # Run this in Supabase SQL Editor
```

---

## Accuracy Notes

| Calculation | Accuracy |
|---|---|
| Historical simulation | High — anchored to your real corpus, not estimated |
| Projections | Directional — assumes flat XIRR; real markets are volatile |
| Crossover / stage dates | Exact within the simulation model |
| LTCG tax | Approximate — simplified annual model; real LTCG is per-unit |
| Step-up SIP | Exact — compounds annually from SIP start date |
| Goal extra-SIP recommendation | Accurate to ₹1 (28-iteration binary search) |

---

## License

MIT
