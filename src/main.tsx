import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import './index.css'
import Dashboard from './pages/Dashboard.tsx'
import Login from './pages/auth/Login.tsx'
import Profile from './pages/Profile.tsx'
import Signup from './pages/auth/Signup.tsx'
import Track from './pages/Track.tsx'
import CreateRequest from './pages/CreateRequest.tsx'
import BrowseRequests from './pages/BrowseRequests.tsx'
import MySessions from './pages/MySessions.tsx'
import ApplicationsReview from './pages/ApplicationsReview.tsx'
import AuthCallback from './pages/AuthCallback.tsx'
import OwnerDashboard from './pages/owner/OwnerDashboard.tsx'
import WalkerProfile from './pages/owner/walkerProfile';
import MainProfile from './pages/MainProfile.tsx';
import OwnerDogs from './pages/OwnerDogs.tsx'
import WalkerDashboard from './pages/walker/WalkerDashboard.tsx'
import CompletedWalks from './pages/walker/CompletedWalks.tsx'
import Broadcast from './pages/owner/BroadcastWalk.tsx'
import ScheduleWalk from './pages/owner/ScheduleWalk.tsx'
import DeviceStateContext from './DeviceStateContext.tsx'
import { BrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Dashboard
  },
  {
    path: "/login",
    Component: Login
  },
  {
    path: "/signup",
    Component: Signup
  },
  {
    path: "/profile",
    Component: Profile
  },
  {
    path: "/userprofile",
    Component: MainProfile
  },
  {
    path: "/view-dogs",
    Component: OwnerDogs
  },
  {
    path: "/track/:id",
    Component: Track
  },
 /*  {
    path: "/requests/new",
    Component: CreateRequest
  }, */
  {
    path: "/requests",
    Component: BrowseRequests
  },
  {
    path: "/my-sessions",
    Component: MySessions
  },
  {
    path: "/applications/:sessionId",
    Component: ApplicationsReview
  },
  {
    path: "/auth/callback",
    Component: AuthCallback
  },
  {
    path: "/owner/dashboard",
    Component: OwnerDashboard
  },
  {
    path: "/owner/broadcast",
    Component: Broadcast
  },
  {
    path: "/owner/schedule/:walkerID?",
    Component: ScheduleWalk
  },
  {
    path: "/owner/walker/:id",
    Component: WalkerProfile
  },
  {
    path: "/walker/dashboard",
    Component: WalkerDashboard
  },
  {
    path: "/walker/completed-walks",
    Component: CompletedWalks
  }
]);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeviceStateContext>
        <BrowserRouter>
          <RouterProvider router={router} />
        </BrowserRouter>
    </DeviceStateContext>
  </StrictMode>,
)
