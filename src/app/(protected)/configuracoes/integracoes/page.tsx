"use client";

import { DashboardPage } from "../../page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, PlugZap } from "lucide-react";

function IntegracoesPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-dashed border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <PlugZap className="w-5 h-5 text-emerald-600" />
            Integrações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Estamos preparando conectores para ERPs, Z-API e outras fontes de dados estratégicas para sua operação.</p>
          <p className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            Enquanto isso, continue registrando dados manualmente ou contate nosso time para integrações personalizadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfiguracoesIntegracoesPage() {
  return (
    <DashboardPage
      initialView="configuracoes-integracoes"
      extraRoutes={{
        "configuracoes-integracoes": {
          title: "Configurações · Integrações",
          path: "/configuracoes/integracoes",
          component: <IntegracoesPlaceholder />,
        },
      }}
    />
  );
}

