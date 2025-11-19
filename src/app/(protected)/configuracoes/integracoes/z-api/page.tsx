"use client";

import { DashboardPage } from "../../../page";
import ZApiView from "@/components/configuracoes/ZApiView";

export default function ConfiguracoesZApiPage() {
  return (
    <DashboardPage
      initialView="configuracoes-integracoes-z-api"
      extraRoutes={{
        "configuracoes-integracoes-z-api": {
          title: "Configurações · Integrações · Z-API",
          path: "/configuracoes/integracoes/z-api",
          component: <ZApiView />,
        },
      }}
    />
  );
}

