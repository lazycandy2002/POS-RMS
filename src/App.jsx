import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
import Quotations from './pages/Qoutations'
import Clients from './pages/Clients'
import InstallationAndRepairs from './pages/InstallationAndRepairs'
import Settings from './pages/Settings'
import Employees from './pages/Employees'
import ProtectedRoute from './ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/installation-repairs" element={
        <ProtectedRoute><InstallationAndRepairs /></ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute><Products /></ProtectedRoute>
      } />
      <Route path="/stock-in" element={
        <ProtectedRoute><StockIn /></ProtectedRoute>
      } />
      <Route path="/stock-out" element={
        <ProtectedRoute><StockOut /></ProtectedRoute>
      } />
      <Route path="/quotations" element={
        <ProtectedRoute><Quotations /></ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute><Clients /></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><Settings /></ProtectedRoute>
      } />
      <Route path="/employees" element={
        <ProtectedRoute><Employees /></ProtectedRoute>
      } />

      {/* catch-all: unknown paths go to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}