"use client";

import { DashboardPage } from "../page";
import FormulariosView from "@/components/formularios/FormulariosView";

export default function FormulariosPage() {
  return (
    <DashboardPage
      initialView="formularios"
      extraRoutes={{
        formularios: {
          title: "Formulários",
          path: "/formularios",
          component: <FormulariosView />,
        },
      }}
    />
  );
}

