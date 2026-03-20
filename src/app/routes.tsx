import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { CallScreen } from '../features/call/CallScreen'
import { ErrorBoundary } from '../shared/components/ErrorBoundary'

const DashboardScreen = lazy(() => import('../features/dashboard/DashboardScreen'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ErrorBoundary><CallScreen /></ErrorBoundary>,
  },
  {
    path: '/dashboard/:sessionId',
    element: (
      <ErrorBoundary>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
          <DashboardScreen />
        </Suspense>
      </ErrorBoundary>
    ),
  },
])
