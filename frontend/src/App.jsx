import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/authStore'
import LandingPage from './components/landing/LandingPage'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import ForgotPasswordPage from './components/auth/ForgotPasswordPage'
import GitHubCallbackPage from './components/auth/GitHubCallbackPage'
import GoogleCallbackPage from './components/auth/GoogleCallbackPage'
import ConfirmEmailPage from './components/auth/ConfirmEmailPage'
import DashboardLayout from './components/dashboard/DashboardLayout'
import DashboardOverview from './components/dashboard/DashboardOverview'
import VerifyEmailPage from './components/dashboard/VerifyEmailPage'
import BulkJobsPage from './components/dashboard/BulkJobsPage'
import DeliverabilityPage from './components/dashboard/DeliverabilityPage'
import ApiKeysPage from './components/dashboard/ApiKeysPage'
import BillingPage from './components/dashboard/BillingPage'
import SettingsPage from './components/dashboard/SettingsPage'
import HeaderAnalyzerPage from './components/dashboard/HeaderAnalyzerPage'
import EmailFinderPage from './components/dashboard/EmailFinderPage'
import InboxPlacementPage from './components/dashboard/InboxPlacementPage'
import TeamsPage from './components/dashboard/TeamsPage'
import ReferralPage from './components/dashboard/ReferralPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/github/callback" element={<GitHubCallbackPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/verify-email" element={<ConfirmEmailPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="verify" element={<VerifyEmailPage />} />
            <Route path="bulk" element={<BulkJobsPage />} />
            <Route path="deliverability" element={<DeliverabilityPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="header-analyzer" element={<HeaderAnalyzerPage />} />
            <Route path="email-finder" element={<EmailFinderPage />} />
            <Route path="inbox-placement" element={<InboxPlacementPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="referral" element={<ReferralPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
