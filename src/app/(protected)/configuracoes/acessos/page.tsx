"use client";

import { DashboardPage } from "../../page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Shield } from "lucide-react";

function AcessosPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-dashed border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Shield className="w-5 h-5 text-emerald-600" />
            Perfis e Acessos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Em breve você poderá gerenciar papéis, permissões e convites diretamente por aqui.</p>
          <p className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="w-4 h-4" />
            Caso precise ajustar alguma permissão urgentemente, contate o suporte TEM VENDA.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfiguracoesAcessosPage() {
  return (
    <DashboardPage
      initialView="configuracoes-acessos"
      extraRoutes={{
        "configuracoes-acessos": {
          title: "Configurações · Perfis e Acessos",
          path: "/configuracoes/acessos",
          component: <AcessosPlaceholder />,
        },
      }}
    />
  );
}

