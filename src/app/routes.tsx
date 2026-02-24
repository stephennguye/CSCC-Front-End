import { createBrowserRouter } from 'react-router-dom'
import { CallScreen } from '../features/call/CallScreen'
import { DashboardScreen } from '../features/dashboard/DashboardScreen'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <CallScreen />,
  },
  {
    path: '/dashboard/:sessionId',
    element: <DashboardScreen />,
  },
])
