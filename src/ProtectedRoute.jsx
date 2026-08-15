import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  const employee = sessionStorage.getItem("employee")

  if (!employee) return <Navigate to="/login" replace />

  return children
}