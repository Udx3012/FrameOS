import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import { lazy, Suspense } from 'react'

const Pricing = lazy(() => import('./pages/Pricing.tsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'))
const Studio = lazy(() => import('./pages/Studio.tsx'))

import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { authEnabled } from './lib/convexApi'
import { initPostHog } from './lib/posthog'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
initPostHog();

const rawPk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
const pk = rawPk?.trim()
const rawConvexUrl = (import.meta.env.VITE_CONVEX_URL as string | undefined) || 'https://placeholder.convex.cloud'
const convexUrl = rawConvexUrl.trim()
const convex = new ConvexReactClient(convexUrl)

const PageFallback = () => (
  <div className="min-h-screen bg-warmBg flex items-center justify-center">
    <span className="h-6 w-6 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
  </div>
)

const routes = (
  <BrowserRouter>
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/create" element={<Dashboard />} />
        <Route path="/studio/:id" element={<Studio />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
)

import { Component, type ReactNode } from 'react'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("Uncaught runtime error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-warmBg flex flex-col items-center justify-center p-6 text-center text-charcoal">
          <h2 className="font-display text-2xl font-bold">Something went wrong</h2>
          <p className="font-mono text-xs text-secondaryText mt-2 max-w-md">{this.state.error?.message || "An unexpected error occurred."}</p>
          <button onClick={() => window.location.assign("/create")} className="mt-6 rounded-xl bg-charcoal px-5 py-2.5 text-sm font-semibold text-white hover:bg-electricBlue transition-colors">
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Clerk (Google sign-in) activates when the publishable key is set; Convex is always provided.
function Root() {
  if (authEnabled && pk) {
    return (
      <ErrorBoundary>
        <ClerkProvider publishableKey={pk} afterSignOutUrl="/"
          signInForceRedirectUrl="/create" signUpForceRedirectUrl="/create">
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {routes}
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </ErrorBoundary>
    )
  }
  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>{routes}</ConvexProvider>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
