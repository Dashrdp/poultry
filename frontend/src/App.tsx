import { Loader } from '@cloudflare/kumo'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { AnalyticsComparePage } from './components/AnalyticsComparePage'
import { LoginPage } from './components/LoginPage'
import { FarmDetailPage } from './components/FarmDetailPage'
import { FarmsPage } from './components/FarmsPage'
import { GodownPage } from './components/GodownPage'
import { ManagerFarmDetail } from './components/ManagerFarmDetail'
import { ManagerHome } from './components/ManagerHome'
import { ManagerShell } from './components/ManagerShell'
import { ManagersPage } from './components/ManagersPage'
import { OwnerAnalytics } from './components/OwnerAnalytics'
import { OwnerDashboard } from './components/OwnerDashboard'
import { OwnerShell } from './components/OwnerShell'
import { PortfolioPage } from './components/PortfolioPage'
import { ShedAnalyticsPage } from './components/ShedAnalyticsPage'
import { ShedLogPage } from './components/ShedLogPage'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (user.role === 'farm_manager') {
    return (
      <BrowserRouter>
        <Routes>
          <Route element={<ManagerShell />}>
            <Route path="/" element={<ManagerHome />} />
            <Route path="/farms/:farmId" element={<ManagerFarmDetail />} />
            <Route path="/farms/:farmId/godown" element={<GodownPage />} />
            <Route
              path="/farms/:farmId/sheds/:shedId"
              element={<ShedLogPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<OwnerShell />}>
          <Route path="/" element={<OwnerDashboard />} />
          <Route path="/analytics" element={<Navigate to="/analytics/portfolio" replace />} />
          <Route path="/analytics/portfolio" element={<PortfolioPage />} />
          <Route path="/analytics/compare" element={<AnalyticsComparePage />} />
          <Route path="/analytics/trends" element={<OwnerAnalytics />} />
          <Route path="/analytics/sheds/:shedId" element={<ShedAnalyticsPage />} />
          <Route path="/farms" element={<FarmsPage />} />
          <Route path="/farms/:farmId" element={<FarmDetailPage />} />
          <Route path="/farms/:farmId/godown" element={<GodownPage />} />
          <Route path="/farms/:farmId/sheds/:shedId" element={<ShedLogPage />} />
          <Route path="/managers" element={<ManagersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
