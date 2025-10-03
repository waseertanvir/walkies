import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import './index.css'
import App from './pages/App.tsx'
import Login from './pages/Login.tsx'
import Forms from './pages/Forms.tsx'
import Signup from './pages/Signup.tsx'

const router = createBrowserRouter([
  {
    path: "/",
    Component: App
  },
  {
    path: "/login",
    Component: Login
  },
  {
    path: "/forms",
    Component: Forms
  },
  {
    path: "/signup",
    Component: Signup
  },
]);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
