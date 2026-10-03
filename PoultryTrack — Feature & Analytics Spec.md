# PoultryTrack — Feature & Analytics Spec

Oct 2, 2026 · @DashRDP

## 1. Market scan

PoultryTrack's wedge: the fastest daily entry for Farm Managers plus the best multi-farm, shed-vs-shed comparison for Owners. Existing tools are mostly ERP-style (accounting-first, desktop-era UI) or IoT-controller software tied to hardware; few do clean mobile capture with owner-level benchmarking.

| Product | Type | What they do well | What to copy |
| --- | --- | --- | --- |
| [Poultry Desk (Data Daur)](https://www.datadaur.com/poultry-farm-management-software) | Cloud ERP | 7-stage lifecycle, breed-standard benchmarking, 10 KPI widgets, critical alerts panel; layer module has shift-based egg collection, hen-day %, 4-grade egg classification, tray auto-calc; daily log has ammonia, humidity, min/max temp | Lifecycle stages, alerts panel, tray math, shed environment fields |
| [Techence LAYER](https://www.techenceit.com/layerpoultry.php) | Indian ERP (Android/Windows) | Daily and per-egg production cost, flock-wise comparison, standard vs actual, vaccine notifications, P&L, SMS alerts, stock, access rights | Cost per egg, standard vs actual, SMS/WhatsApp alerts |
| [PoultryOS](https://www.poultryos.com/poultryos-layer-management-software/) | Cloud ERP | Layer life cycle (brooding, growing, pre-lay, laying), egg bifurcation (commercial, cracked, leak), feed/material transfer requests, bird cost amortization | Egg grades, godown-to-shed feed transfers, bird cost amortization |
| [Layer Farm Manager (PoultryCare)](https://www.poultry.care/blog/poultry-management-erp-software) | Cloud | House-wise daily recording, compare houses, FCR, expenses per house, benchmark vs breed standard | House comparison, expense per shed |
| [PoultryPlan OptiLayers](https://www.poultryplan.com/solutions/optilayers) | Enterprise | Task scheduling (feeding, collection, manure), egg storage and packing station | Task checklists, egg store inventory |
| [MAXIMUS](https://www.maximus-solution.com/en/solutions/poultry-management/poultry-software-features/) | IoT + software | Linked sensors (water meters, scales), alarms on abnormal water use, comparative reports | Water-use anomaly alerts (later, via IoT) |
| [FarmKeep](https://www.farmkeep.com/farm-type/poultry-management-software) / [SmartBird](https://smartbirdapp.com/layer-farm-management-software/) | Small-farm apps | Simple egg logging, expenses, sales | Simplicity of entry |

Gaps to exploit:

- Owners with 3+ farms get house reports, not a true portfolio view (rank farms and sheds on the same KPIs, age-normalized).
- Entry is form-heavy and online-only; Indian sheds have weak network.
- Almost nobody ties the daily NECC egg rate to revenue estimates, even though NECC rates move daily and differ by city (e.g. Namakkal vs Delhi).
- Alerts are mostly vaccination reminders, not production anomalies (sudden drop in eggs, mortality spike, feed per bird jump).

## 2. Roles, permissions and data model

Everything hangs off Organization → Farm → Shed → Flock, with each Godown belonging to a Farm. Permissions are granted per farm, so one person can manage Farm A and only view Farm B.

| Role | Scope | Can do | Phase |
| --- | --- | --- | --- |
| Owner | All farms in the org | Dashboards, comparisons, settings, users, approve late edits, financials | MVP |
| Farm Manager | Assigned farms | Daily shed entry, godown stock in/out, flock placement and transfer, see own farm dashboard | MVP |
| Supervisor | Assigned sheds | Daily entry only for their sheds; cannot edit after submit | v2 |
| Accountant | Org or farms | Sales, expenses, purchase bills, egg rate entry; no production edits | v2 |
| Vet / Consultant | Selected farms, time-boxed | Read-only + health notes, treatments, vaccination records | v2 |

Core entities:

| Entity | Key fields | Notes |
| --- | --- | --- |
| Organization | name, plan, currency, timezone, egg unit (tray of 30 / peti of 210) | Tenant boundary; every row carries org\_id |
| Farm | name, location, NECC zone, manager(s) | NECC zone drives egg-rate lookups |
| Shed | farm\_id, name, capacity, type (cage / deep litter / aviary), active | Capacity enables occupancy % |
| Flock (batch) | shed\_id, breed, hatch date, placed date, birds placed, source, chick cost, status (brooding, growing, pre-lay, laying, depleted) | Age in weeks is derived from hatch date, never typed |
| Daily shed record | date, flock\_id, opening birds, mortality, culls, sold, transferred in/out, closing birds, eggs by grade, feed issued (kg), water (L), min/max temp, notes, photos, submitted\_by | One row per flock per day; closing birds = opening − losses ± transfers |
| Godown | farm\_id, name | Feed and medicine store |
| Stock item | name, category (feed, medicine, vaccine, packing), unit, feed type (pre-lay, layer phase 1/2) |  |
| Stock movement | godown\_id, item, type (purchase, issue to shed, transfer, adjustment, return), qty, rate, ref | Godown balance = sum of movements; issue-to-shed feeds the daily record |
| Egg store | farm\_id, date, opening, collected (from daily records), sold, damaged, closing by grade |  |
| Sale / Expense | date, farm, party, qty, rate, amount, category | v2 for full finance |
| Breed standard | breed, age week, HDEP %, HHEP cumulative, feed g/bird/day, cumulative mortality %, egg weight g, body weight g | Seed from breeder guides (Hy-Line, BV300, Lohmann); owner can edit |
| Audit log | who, what, before, after, when | Every edit to a submitted day is logged |

Rules worth enforcing from day one: a day's record locks 48 hours after submission and later edits need Owner approval; every number shown on a dashboard is recomputed from raw rows, never stored as a typed total.

## 3. Daily data capture (Farm Manager)

Target: a full shed entry in under 60 seconds on a cheap Android phone, offline. If entry is slow, data stops coming and the Owner dashboard dies.

The daily screen, one card per shed:

1. Opening birds: pre-filled from yesterday's closing; never typed.
2. Mortality and culls: two number fields with +/- steppers; optional cause dropdown (disease, heat, pecking, prolapse, unknown) and photo.
3. Eggs: entered in trays + loose (tray size from org setting) and auto-converted to count; split into grades (normal, small, cracked, dirty/leak, double-yolk). Support 2 collection shifts that sum to the day.
4. Feed: kg issued from godown to this shed; pre-filled with yesterday's quantity. Saving it posts a godown stock movement automatically.
5. Water (L), min/max temperature, notes: optional, collapsed by default.
6. Submit: shows a one-line summary (HDEP %, feed g/bird, mortality %) before confirm, so mistakes are caught on the spot.

Validation that catches typos without blocking real problems:

| Check | Rule (default, editable per org) | Action |
| --- | --- | --- |
| Eggs > birds | eggs > closing birds | Block |
| HDEP swing | today's HDEP differs from 7-day average by > 8 points | Warn, ask to confirm |
| Mortality spike | daily mortality > 0.1% of birds, or > 3× 7-day average | Warn + raise alert to Owner |
| Feed per bird | outside 80–130 g/bird/day for a laying flock | Warn |
| Godown stock | issue would make stock negative | Block, prompt for purchase entry |
| Missing day | no entry by 11:00 next day | Reminder to Manager, flag on Owner dashboard |

Godown screen: current stock per item with days-of-cover (stock ÷ 7-day average daily issue), purchase entry with bill photo, transfer between godowns, and month-end physical count to post an adjustment.

Must-haves for adoption in Indian farms: Kannada, Hindi, Telugu, Tamil and Marathi UI; big number keypad; works fully offline and syncs later; WhatsApp share of the day's summary.

## 4. Feature list by module

Ship MVP to win daily usage, v2 to win the Owner's wallet (money and health), v3 to lock in (automation and benchmarks).

| Module | Feature | Phase |
| --- | --- | --- |
| Setup | Org, farms, sheds, godowns, users, per-farm roles, invite by phone OTP | MVP |
| Setup | Breed library with standards preloaded; custom breed upload (CSV) | MVP |
| Flock | Place flock (breed, hatch date, count, chick cost); auto age in weeks; lifecycle stage auto-advance by age | MVP |
| Flock | Transfer birds between sheds or farms (grower → layer house); partial depletion and final depletion | MVP |
| Daily | Shed daily entry (Section 3), offline, multilingual, 2 shifts, egg grades | MVP |
| Daily | Missing-entry tracker and reminders | MVP |
| Godown | Stock items, purchases, issues, transfers, physical count, days-of-cover | MVP |
| Eggs | Egg store: collected, sold, damaged, closing stock by grade | MVP |
| Dashboard | Owner portfolio, farm comparison, shed drilldown, flock vs standard (Section 6) | MVP |
| Alerts | Production drop, mortality spike, feed anomaly, low stock, missing entry; in-app + WhatsApp | MVP |
| Reports | Daily summary, weekly flock report, monthly farm report; PDF and Excel export | MVP |
| Audit | Edit log, late-edit approval | MVP |
| Health | Vaccination schedule template per breed, due/overdue list, record with batch no.; medicines and treatments with withdrawal days | v2 |
| Health | Body weight and uniformity sampling (weigh 50–100 birds, auto CV %) | v2 |
| Finance | Sales (party, trays, rate), receivables, expenses by category, purchase bills | v2 |
| Finance | Cost per egg and per tray, flock P&L, feed cost share; NECC daily rate by zone for revenue estimates | v2 |
| Ops | Task checklists (lighting, manure removal, cleaning) with photo proof | v2 |
| Ops | Lighting programme log (hours/day) | v2 |
| Feed | Feed formula/recipe and ingredient stock if farm mixes its own feed | v3 |
| Forecast | Projected eggs and feed for next 4–8 weeks from breed curve × live birds | v3 |
| Insight | Anonymous regional benchmarks (your HDEP at week 40 vs similar farms) | v3 |
| Integrations | IoT: water meters, temperature/ammonia sensors, egg counters; Tally export; public API | v3 |
| AI | Ask-your-data chat ("why did Shed 3 drop last week?"), weekly auto-written owner summary | v3 |

## 5. KPI definitions

Hen-day egg production (HDEP %) is the headline metric; every KPI must be compared against the breed standard at the same age in weeks, because a 25-week flock and a 70-week flock are not comparable on raw numbers.

```latex
\text{HDEP}\,\% = \frac{\text{eggs produced in period}}{\sum \text{live birds each day}} \times 100
```

| KPI | Formula | Healthy reference (white layer, e.g. Hy-Line W-80) |
| --- | --- | --- |
| HDEP % | eggs ÷ bird-days × 100 | Peak 95–97% |
| Hen-housed eggs (HHE) | cumulative eggs ÷ birds originally housed | About 253–260 to 60 weeks |
| Gap to standard | actual HDEP − standard HDEP at same age | Within −3 points; flag below −5 |
| Mortality % (daily, weekly, cumulative) | dead + culled ÷ opening birds × 100 | Investigate if weekly > 0.1% |
| Livability % | closing birds ÷ birds housed × 100 | About 96.5% to 60 weeks |
| Feed intake | feed kg × 1000 ÷ bird-days (g/bird/day) | 101–108 g/bird/day average |
| Feed per 10 eggs / per dozen | feed kg ÷ eggs × 10 (or × 12) | 1.10–1.15 kg per 10 eggs (20–60 wk) |
| FCR (kg feed ÷ kg egg) | feed kg ÷ (eggs × avg egg weight kg) | About 1.88 (20–60 wk) |
| Egg mass | HDEP × avg egg weight ÷ 100 (g/bird/day) | Needs egg weight sampling |
| Saleable % | (eggs − cracked − dirty) ÷ eggs × 100 | Target > 97% |
| Occupancy % | live birds ÷ shed capacity × 100 | Planning metric |
| Feed days-of-cover | godown stock ÷ 7-day avg daily issue | Alert below 5 days |
| Cost per egg (v2) | (feed + birds amortized + medicine + labour + overheads) ÷ eggs | Compare with NECC zone rate |
| Margin per tray (v2) | (realised or NECC rate × 30) − cost per egg × 30 | Owner's money metric |

Reference ranges are from Hy-Line W-80 guides ([management guide](https://www.hylinesa.co.za/sitepad-data/uploads/2022/08/Hy-Line-W80-Commercial-Mnagement-Guide.pdf), [North America aviary/barn standards](https://hylinena.com/wp-content/uploads/2019/10/80_Alt_ENG.pdf), [parent stock guide](https://www.hyline.com/filesimages/Hy-Line-Products/Hy-Line-Product-PDFs/W-80/80%20PS%20ENG.pdf)); store full week-by-week tables per breed rather than these summaries.

Computation rules: use bird-days (sum of daily live birds), not period-end birds; aggregate farm and org KPIs by summing numerators and denominators, never averaging percentages; show week-of-age on every flock chart.

## 6. Analytics dashboard design

The Owner dashboard should answer three questions in 10 seconds: is anything wrong today, which farm or shed is underperforming against its age standard, and are we making money. Build four screens, each one click deeper.

**Screen 1: Portfolio (Owner home)**

- KPI strip (yesterday, with change vs 7-day average): live birds, eggs, HDEP %, gap to standard, mortality %, feed g/bird, feed days-of-cover, data completeness (sheds reported / total).
- Alerts panel at top: red/amber items with one-tap jump to the shed.
- Farm cards: one per farm with HDEP vs standard sparkline (last 8 weeks), mortality, feed per 10 eggs, and a traffic-light status.
- Egg trend: daily eggs for the last 30/90 days, stacked by farm, with the standard-expected line overlaid.

**Screen 2: Compare (farms and sheds)**

- Ranking table: rows = farms or sheds, columns = age (weeks), birds, HDEP, gap to standard, mortality (week, cumulative), feed g/bird, feed per 10 eggs, saleable %. Sort by any column; colour each cell by deviation from standard, not by raw value.
- Age-aligned overlay: HDEP by week of age for every selected flock on one chart, with the breed curve as a band. This is the single most useful chart for an owner and few competitors do it well.
- Scatter: gap to standard (x) vs feed per 10 eggs (y), one dot per shed; bottom-left is the problem quadrant.

**Screen 3: Shed / flock drilldown**

- Daily table and charts: HDEP vs standard, mortality bars with 7-day line, feed g/bird vs standard, egg grade mix, temperature min/max.
- Event markers on charts: vaccination, medicine, feed type change, transfer, heat wave note. Lets the owner see cause next to effect.
- Flock lifetime summary: housed, livability, HHE to date, projected HHE at depletion.

**Screen 4: Godown and eggs**

- Stock by item with days-of-cover bars, consumption trend, purchase history and rate trend.
- Egg store: collected vs sold vs closing, by grade; ageing of unsold stock.

Design rules:

- Default period = yesterday + last 7 days; date picker supports day, week, month, flock-to-date.
- Every number links to the rows that produced it.
- Mobile layout first for owners too: KPI strip and alerts fit one phone screen.
- Show data completeness everywhere; a farm with 2 of 6 sheds reported must not look like a production crash.

Alert rules (defaults, owner-editable):

| Alert | Trigger | Channel |
| --- | --- | --- |
| Production drop | HDEP down > 5 points vs 3-day avg, or gap to standard < −5 for 3 days | WhatsApp + app |
| Mortality spike | daily > 0.1% or > 3× 7-day avg | WhatsApp + app, immediate |
| Feed anomaly | feed g/bird ±15% vs 7-day avg | App |
| Low feed stock | days-of-cover < 5 | WhatsApp |
| Missing entry | shed not reported by 11:00 | Manager first, Owner after 2 h |
| Vaccination due (v2) | due tomorrow / overdue | Manager + vet |

## 7. Technical build notes

Recommended stack: Postgres as the single source of truth, a Next.js web app for Owners, and an Expo (React Native) app with local SQLite for offline Farm Manager entry, synced to Postgres.

| Layer | Choice | Why |
| --- | --- | --- |
| Database | Postgres (Supabase or Neon) with row-level security on org\_id | Multi-tenant isolation without separate DBs |
| Owner web | Next.js on Vercel, ECharts or Recharts | Fits your existing stack |
| Field app | Expo + SQLite + a Postgres sync layer (PowerSync or ElectricSQL) | True offline; a PWA alone is fragile on low-end Android |
| Auth | Phone OTP (MSG91 or Firebase) | Managers rarely use email |
| Alerts | WhatsApp Cloud API or a BSP (Gupshup, Interakt) + push | WhatsApp is where farm owners live |
| Jobs | Cron/queue for nightly rollups, missing-entry checks, NECC rate fetch |  |
| Files | Object storage for photos and bills, compressed client-side |  |

Data design that keeps the dashboards fast and correct:

- Raw tables (daily\_shed\_record, stock\_movement) are append-friendly; every row has a client-generated UUID so offline retries are idempotent.
- A `flock_day_stats` table (one row per flock per day: bird-days, eggs, saleable eggs, feed kg, deaths, age\_week, standard values joined in) is rebuilt for that flock-day whenever a record changes. All dashboards read from it.
- Weekly and farm rollups are SQL views over `flock_day_stats` that sum numerators and denominators.
- Store standards as `breed_standard(breed_id, age_week, hdep, feed_g, mort_cum, egg_wt, bw)` and join on age\_week.

```sql
create table flock_day_stats (
  org_id uuid, farm_id uuid, shed_id uuid, flock_id uuid,
  day date, age_week int,
  bird_days int, deaths int, culls int,
  eggs int, saleable_eggs int, feed_kg numeric(10,2),
  std_hdep numeric(5,2), std_feed_g numeric(6,1),
  primary key (flock_id, day)
);
-- HDEP for any grouping = 100.0 * sum(eggs) / nullif(sum(bird_days),0)
```

Sync conflicts: the server is authoritative after the 48-hour lock; before that, last write wins per field and both versions go to the audit log. Use the farm's timezone for the day boundary, not the server's.

## 8. Roadmap and pricing

Build in three phases and only move on when the gate is met: usage first, then payment, then automation.

&#91;embedded content: build roadmap · 3 phases, 2 gates\]

Don't start v2 until Managers enter data daily without being chased; dashboards are worthless without that habit.

Pricing (starting hypotheses to test in the pilot; price on bird capacity, since that tracks the owner's revenue):

| Plan | Limit | Includes | Price idea (INR/month) |
| --- | --- | --- | --- |
| Free | 1 farm, 2 sheds, 1 user | Daily entry, basic dashboard | 0 |
| Starter | Up to 25,000 birds | All MVP, 5 users, PDF/Excel reports | 1,499 |
| Growth | Up to 1,00,000 birds | Multi-farm compare, WhatsApp alerts, unlimited users, v2 finance and health | 3,999 |
| Enterprise | Above 1,00,000 birds | Integrations, API, custom standards, onboarding | Custom |

Go-to-market: onboard 5–10 multi-farm owners free for 60 days, enter their past 4 weeks of data for them, and use their feedback to set final prices; feed dealers, hatchery reps and poultry vets are the best referral channel.
