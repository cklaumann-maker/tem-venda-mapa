"use client";

import { DashboardPage } from "../../page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlugZap, MessageSquare, Package, ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function IntegracoesMenuView() {
  const router = useRouter();

  const integrations = [
    {
      id: "z-api",
      title: "Z-API",
      description: "Configure a integração com WhatsApp via Z-API para envio de notificações e mensagens",
      icon: MessageSquare,
      path: "/configuracoes/integracoes/z-api",
      status: "active" as const,
      color: "emerald" as const,
    },
    {
      id: "erp",
      title: "Sistema ERP",
      description: "Conecte seu sistema ERP para sincronização automática de dados",
      icon: Package,
      path: "#",
      status: "coming-soon" as const,
      color: "blue" as const,
    },
    {
      id: "api",
      title: "API Externa",
      description: "Configure integrações com APIs externas e webhooks personalizados",
      icon: PlugZap,
      path: "#",
      status: "coming-soon" as const,
      color: "purple" as const,
    },
  ];

  const handleIntegrationClick = (integration: typeof integrations[0]) => {
    if (integration.status === "coming-soon") {
      return;
    }
    router.push(integration.path);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <PlugZap className="w-8 h-8 text-emerald-600" />
          Integrações
        </h1>
        <p className="text-gray-600 mt-2">Gerencie todas as integrações do sistema em um só lugar</p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isAvailable = integration.status === "active";
          
          return (
            <Card
              key={integration.id}
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg group ${
                isAvailable
                  ? "cursor-pointer hover:border-emerald-300 hover:-translate-y-1"
                  : "opacity-75 cursor-not-allowed"
              }`}
              onClick={() => handleIntegrationClick(integration)}
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${
                integration.color === "emerald" ? "from-emerald-500/10 to-emerald-600/5" :
                integration.color === "blue" ? "from-blue-500/10 to-blue-600/5" :
                "from-purple-500/10 to-purple-600/5"
              } rounded-bl-full`} />
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${
                    integration.color === "emerald" ? "bg-emerald-100 text-emerald-600" :
                    integration.color === "blue" ? "bg-blue-100 text-blue-600" :
                    "bg-purple-100 text-purple-600"
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {!isAvailable && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      Em breve
                    </span>
                  )}
                </div>
                <CardTitle className="mt-4 text-xl text-gray-900">{integration.title}</CardTitle>
                <CardDescription className="mt-2 text-sm text-gray-600">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className={`flex items-center justify-between text-sm font-medium transition-colors ${
                  isAvailable
                    ? integration.color === "emerald" ? "text-emerald-600 group-hover:text-emerald-700" :
                      integration.color === "blue" ? "text-blue-600 group-hover:text-blue-700" :
                      "text-purple-600 group-hover:text-purple-700"
                    : "text-muted-foreground opacity-50"
                }`}>
                  <span>{isAvailable ? "Configurar" : "Em breve"}</span>
                  {isAvailable && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Precisa de uma integração personalizada?</p>
              <p className="text-xs text-amber-700 mt-1">
                Entre em contato com nosso time para integrar sistemas específicos ou APIs customizadas.
              </p>
            </div>
          </div>
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
          component: <IntegracoesMenuView />,
        },
      }}
    />
  );
}
