"use client";

import Link from "next/link";
import { DashboardPage } from "../page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Cog, Building2, LayoutDashboard, Users2, PlugZap } from "lucide-react";

const configOptions = [
  {
    title: "Empresas",
    description: "Logos, nomes e status das empresas cadastradas.",
    icon: Building2,
    href: "/configuracoes/empresas",
    status: "Disponível",
  },
  {
    title: "Página inicial",
    description: "Personalize os widgets e destaques do painel principal.",
    icon: LayoutDashboard,
    href: "/configuracoes/home",
    status: "Disponível",
  },
  {
    title: "Perfis e Acessos",
    description: "Gerencie papéis, convites e permissões de usuários.",
    icon: Users2,
    href: "/configuracoes/acessos",
    status: "Disponível",
  },
  {
    title: "Integrações",
    description: "Conecte ERPs, Z-API e outras plataformas parceiras.",
    icon: PlugZap,
    href: "/configuracoes/integracoes",
    status: "Em construção",
  },
];

function ConfiguracoesRoot() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Cog className="w-6 h-6 text-emerald-600" />
          Central de Configurações
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Escolha uma categoria para ajustar informações globais do seu ambiente TEM VENDA. Os itens marcados como
          &ldquo;Em construção&rdquo; serão disponibilizados em breve.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {configOptions.map((option) => {
          const CardWrapper = option.href ? Link : "div";
          const wrapperProps = option.href ? { href: option.href } : {};
          
          return (
            <CardWrapper key={option.title} {...wrapperProps} className={option.href ? "block" : undefined}>
              <Card
                className={`border border-emerald-50 transition-all group ${
                  option.href 
                    ? "cursor-pointer hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5" 
                    : "opacity-75 cursor-not-allowed"
                }`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <option.icon className="w-8 h-8 text-emerald-600" />
                    <div>
                      <CardTitle className="text-base text-gray-900">{option.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      option.status === "Disponível"
                        ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                        : "text-amber-600 border-amber-200 bg-amber-50"
                    }`}
                  >
                    {option.status}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className={`flex items-center justify-between text-sm font-medium transition-colors ${
                    option.href 
                      ? "text-emerald-600 group-hover:text-emerald-700" 
                      : "text-muted-foreground"
                  }`}>
                    <span>{option.href ? `Abrir ${option.title}` : "Em breve"}</span>
                    {option.href && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                  </div>
                </CardContent>
              </Card>
            </CardWrapper>
          );
        })}
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <DashboardPage
      initialView="configuracoes"
      extraRoutes={{
        configuracoes: {
          title: "Configurações",
          path: "/configuracoes",
          component: <ConfiguracoesRoot />,
        },
      }}
    />
  );
}

