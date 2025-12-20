"use client";

import { DashboardPage } from "../../page";
import { PerfisEAcessosView } from "@/components/configuracoes/PerfisEAcessosView";

export default function ConfiguracoesAcessosPage() {
  return (
    <DashboardPage
      initialView="configuracoes-acessos"
      extraRoutes={{
        "configuracoes-acessos": {
          title: "Configurações · Perfis e Acessos",
          path: "/configuracoes/acessos",
          component: <PerfisEAcessosView />,
        },
      }}
    />
  );
}

