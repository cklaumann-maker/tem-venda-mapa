"use client";

import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { StoreProvider } from "@/contexts/StoreContext";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <ProtectedRoute>
      <StoreProvider>{children}</StoreProvider>
    </ProtectedRoute>
  );
}

