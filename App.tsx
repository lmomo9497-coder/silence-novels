import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { ReadingSettingsProvider } from './context/ReadingSettingsContext'
import { ToastProvider } from './components/ui/Toast'
import { Layout } from './components/layout/Layout'
import { PageLoader } from './components/ui/Spinner'

import Setup from './pages/Setup'
import Home from './pages/Home'
import Browse from './pages/Browse'
import Categories from './pages/Categories'
import NovelDetail from './pages/NovelDetail'
import ChapterReader from './pages/ChapterReader'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import Profile from './pages/Profile'
import Policy from './pages/Policy'
import NotFound from './pages/NotFound'

import Dashboard from './pages/dashboard/Dashboard'
import NovelEditor from './pages/dashboard/NovelEditor'
import ChapterEditor from './pages/dashboard/ChapterEditor'
import CharacterManager from './pages/dashboard/CharacterManager'
import MediaManager from './pages/dashboard/MediaManager'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCategories from './pages/admin/AdminCategories'
import AdminModeration from './pages/admin/AdminModeration'

function Protected({ children, staff = false }: { children: React.ReactNode; staff?: boolean }) {
  const { isAuthenticated, isStaff, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (staff && !isStaff) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/novel/:slug" element={<NovelDetail />} />
        <Route path="/novel/:slug/chapter/:chapterSlug" element={<ChapterReader />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/policy" element={<Policy />} />
        <Route
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />

        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/dashboard/novels/new"
          element={
            <Protected>
              <NovelEditor />
            </Protected>
          }
        />
        <Route
          path="/dashboard/novels/:novelId"
          element={
            <Protected>
              <NovelEditor />
            </Protected>
          }
        />
        <Route
          path="/dashboard/novels/:novelId/chapters/:chapterId"
          element={
            <Protected>
              <ChapterEditor />
            </Protected>
          }
        />
        <Route
          path="/dashboard/novels/:novelId/characters"
          element={
            <Protected>
              <CharacterManager />
            </Protected>
          }
        />
        <Route
          path="/dashboard/novels/:novelId/media"
          element={
            <Protected>
              <MediaManager />
            </Protected>
          }
        />

        <Route
          path="/admin"
          element={
            <Protected staff>
              <AdminDashboard />
            </Protected>
          }
        />
        <Route
          path="/admin/users"
          element={
            <Protected staff>
              <AdminUsers />
            </Protected>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <Protected staff>
              <AdminCategories />
            </Protected>
          }
        />
        <Route
          path="/admin/moderation"
          element={
            <Protected staff>
              <AdminModeration />
            </Protected>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <Setup />
        </ToastProvider>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <FavoritesProvider>
            <ReadingSettingsProvider>
              <AppRoutes />
            </ReadingSettingsProvider>
          </FavoritesProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
