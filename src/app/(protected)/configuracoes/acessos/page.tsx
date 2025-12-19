"use client";

import { DashboardPage } from "../../page";
import { GerenciarUsuariosView } from "@/components/configuracoes/GerenciarUsuariosView";

export default function ConfiguracoesAcessosPage() {
  return (
    <DashboardPage
      initialView="configuracoes-acessos"
      extraRoutes={{
        "configuracoes-acessos": {
          title: "Configurações · Perfis e Acessos",
          path: "/configuracoes/acessos",
          component: <GerenciarUsuariosView />,
        },
      }}
    />
  );
}

