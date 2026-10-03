export type AuthUser = {
  id: string
  email: string
  role: 'owner' | 'farm_manager'
  customer_id: string
}

export type Farm = {
  id: string
  name: string
  location: string
}

export type Breed = {
  id: string
  name: string
  is_system: boolean
}

export type FlockStage = 'brooding' | 'growing' | 'pre_lay' | 'laying' | 'depleted'

export type Flock = {
  id: string
  shed_id: string
  breed_id: string
  breed_name: string
  hatch_date: string
  placed_date: string
  birds_placed: number
  live_birds: number
  source: string | null
  chick_cost: number | null
  depleted_on: string | null
  age_week: number
  stage: FlockStage
}

export type Shed = {
  id: string
  farm_id: string
  name: string
  number: number
  live_bird_count: number
  capacity: number | null
  flock: Flock | null
}

export type DailyLog = {
  shed_id: string
  date: string
  eggs_collected: number
  deaths: number
  notes: string | null
  live_bird_count: number
}

export type LiveCount = {
  shed_id: string
  live_bird_count: number
}

export type FeedDirection = 'in' | 'out'

export type FeedMovement = {
  id: string
  farm_id: string
  direction: FeedDirection
  qty_kg: number
  qty_quintal: number
  date: string
  note: string | null
}

export type GodownPayload = {
  farm_id: string
  stock_kg: number
  stock_quintal: number
  movements: FeedMovement[]
}

export type Manager = {
  id: string
  email: string
  role: 'farm_manager'
  customer_id: string
  farm_ids: string[]
}

export type ShedSummary = {
  id: string
  number: number
  name: string
  bird_count: number
  eggs_today: number
  last_log_date: string
}

export type DashboardKpis = {
  birds: number
  eggs_period: number
  deaths_period: number
  hen_day_pct: number | null
  feed_qty: number
  feed_unit: string
}

export type CompareShedRow = {
  id: string
  number: number
  name: string
  birds: number
  eggs_period: number
  deaths_period: number
  hen_day_pct: number | null
}

export type CompareFarmRow = {
  id: string
  name: string
  birds: number
  eggs_period: number
  deaths_period: number
  hen_day_pct: number | null
  margin: number | null
}

export type RankMetric = 'hen_day' | 'eggs' | 'margin'

export type SeriesPoint = {
  label: string
  eggs: number
  birds: number
}

export type DashboardAlert = {
  code: 'missing_log' | 'low_feed' | 'egg_drop'
  severity: 'warning'
  shed_id: string | null
  shed_name: string | null
  message: string
}

export type FarmRates = {
  farm_id: string
  egg_price: number
  feed_cost_per_kg: number
}

export type MoneySummary = {
  egg_price: number
  feed_cost_per_kg: number
  eggs_period: number
  feed_out_kg: number
  revenue: number
  feed_cost: number
  margin: number
}

export type DashboardPayload = {
  farm: Farm
  from: string
  to: string
  sheds: ShedSummary[]
  kpis: DashboardKpis
  series: SeriesPoint[]
  compare_sheds: CompareShedRow[]
  compare_farms: CompareFarmRow[]
  alerts: DashboardAlert[]
  money: MoneySummary | null
}

export type GapStatus = 'good' | 'watch' | 'bad' | 'unknown'

export type KpiUnit = 'birds' | 'eggs' | 'pct' | 'points' | 'g' | 'days'

export type PortfolioKpi = {
  key: string
  label: string
  value: number | null
  baseline: number | null
  unit: KpiUnit
}

export type Completeness = {
  reported: number
  total: number
}

export type WeeklyHdepPoint = {
  week_start: string
  hdep: number | null
  std_hdep: number | null
}

export type PortfolioFarm = {
  id: string
  name: string
  birds: number
  hdep: number | null
  std_hdep: number | null
  gap: number | null
  mortality_pct: number | null
  feed_per_10_eggs: number | null
  status: GapStatus
  completeness: Completeness
  weekly: WeeklyHdepPoint[]
}

export type EggTrendPoint = {
  date: string
  by_farm: Record<string, number>
  expected: number
}

export type PortfolioPayload = {
  from: string
  to: string
  ref_date: string
  kpis: PortfolioKpi[]
  completeness: Completeness
  week: { hdep: number | null; gap: number | null }
  farms: PortfolioFarm[]
  egg_trend: EggTrendPoint[]
}

export type CompareLevel = 'shed' | 'farm'

export type AnalyticsCompareRow = {
  id: string
  farm_id: string
  name: string
  farm_name: string
  age_week: number | null
  birds: number
  occupancy_pct: number | null
  hdep: number | null
  std_hdep: number | null
  gap: number | null
  mortality_pct: number | null
  mort_cum_pct: number | null
  feed_g: number | null
  std_feed_g: number | null
  feed_per_10_eggs: number | null
  livability_pct: number | null
  hhe: number | null
}

export type AgePoint = {
  age_week: number
  hdep: number | null
}

export type AnalyticsComparePayload = {
  from: string
  to: string
  ref_date: string
  level: CompareLevel
  feed_estimated: boolean
  rows: AnalyticsCompareRow[]
  age_curves: { flock_id: string; shed_id: string; label: string; points: AgePoint[] }[]
  breed_curves: { breed_id: string; name: string; points: AgePoint[] }[]
}

export type ShedDailyPoint = {
  date: string
  age_week: number
  birds: number
  eggs: number
  deaths: number
  hdep: number | null
  std_hdep: number | null
  mortality_pct: number | null
  feed_g: number | null
  std_feed_g: number | null
}

export type ShedLifetime = {
  livability_pct: number
  mort_cum_pct: number | null
  hhe: number
  std_hhe: number | null
  projected_hhe: number
  depletion_week: number
  hdep_28d: number | null
  std_hdep_28d: number | null
  gap_28d: number | null
  feed_g_28d: number | null
  feed_per_10_eggs_28d: number | null
}

export type ShedAnalyticsPayload = {
  from: string
  to: string
  ref_date: string
  shed: { id: string; name: string; farm_id: string; farm_name: string }
  flock: {
    id: string
    breed_name: string
    age_week: number
    stage: FlockStage
    placed_date: string
    birds_placed: number
    live_birds: number
  } | null
  daily: ShedDailyPoint[]
  lifetime: ShedLifetime | null
}
