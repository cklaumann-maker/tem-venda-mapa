"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { StoreProvider } from "@/contexts/StoreContext";
import DashboardPage from "./(protected)/page";

export default function Page() {
  return (
    <ProtectedRoute>
      <StoreProvider>
        <DashboardPage />
      </StoreProvider>
    </ProtectedRoute>
  );
}

