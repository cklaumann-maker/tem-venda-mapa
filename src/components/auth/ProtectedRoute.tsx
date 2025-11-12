"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100/60">
        <span
          className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"
          aria-label="Carregando"
        />
      </div>
    )
  }

  // Se não está autenticado, não renderiza nada (será redirecionado)
  if (!user) {
    return null
  }

  return <>{children}</>
}
