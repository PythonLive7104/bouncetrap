import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/authStore'
import LandingPage from './components/landing/LandingPage'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import ForgotPasswordPage from './components/auth/ForgotPasswordPage'
import ResetPasswordPage from './components/auth/ResetPasswordPage'
import GitHubCallbackPage from './components/auth/GitHubCallbackPage'
import GoogleCallbackPage from './components/auth/GoogleCallbackPage'
import ConfirmEmailPage from './components/auth/ConfirmEmailPage'
import BlogIndexPage from './components/blog/BlogIndexPage'
import BlogPostPage from './components/blog/BlogPostPage'
import ChatWidget from './components/support/ChatWidget'
import ToolsIndexPage from './components/tools/ToolsIndexPage'
import ToolPage from './components/tools/ToolPage'
import IndustryPage from './components/industries/IndustryPage'
import ProviderPage from './components/programmatic/ProviderPage'
import DisposableDomainsPage from './components/programmatic/DisposableDomainsPage'
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
import SMTPTestingPage from './components/dashboard/SMTPTestingPage'
import DomainReputationPage from './components/dashboard/DomainReputationPage'
import AIAdvisorPage from './components/dashboard/AIAdvisorPage'

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
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/github/callback" element={<GitHubCallbackPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/verify-email" element={<ConfirmEmailPage />} />
          <Route path="/blog" element={<BlogIndexPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/tools" element={<ToolsIndexPage />} />
          <Route path="/tools/:slug" element={<ToolPage />} />
          <Route path="/email-verification-for/:slug" element={<IndustryPage />} />
          <Route path="/verify-email/:slug" element={<ProviderPage />} />
          <Route path="/disposable-email-domains" element={<DisposableDomainsPage />} />
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
            <Route path="smtp-testing" element={<SMTPTestingPage />} />
            <Route path="domain-reputation" element={<DomainReputationPage />} />
            <Route path="ai-advisor" element={<AIAdvisorPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatWidget />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
