"use client";

import { Suspense } from "react";
import { DashboardPage } from "../../page";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Type, Power, AlertCircle, ArrowRight, Plus, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { CriarRedeView } from "@/components/configuracoes/empresas/CriarRedeView";
import { AlterarDadosView } from "@/components/configuracoes/empresas/AlterarDadosView";
import { DesativarView } from "@/components/configuracoes/empresas/DesativarView";
import { ReativarView } from "@/components/configuracoes/empresas/ReativarView";

function ConfiguracoesEmpresasContent() {
  const { isAdmin } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Acesso restrito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Somente administradores podem gerenciar as empresas cadastradas.</p>
            <p>Caso precise atualizar informações, procure o responsável pela sua rede ou fale com o suporte TEM VENDA.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar view específica se houver
  if (view === "criar-rede") {
    return <CriarRedeView />;
  }
  if (view === "alterar-dados") {
    return <AlterarDadosView />;
  }
  if (view === "desativar") {
    return <DesativarView />;
  }
  if (view === "reativar") {
    return <ReativarView />;
  }

  // Página principal com botões de navegação
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Gestão de Empresas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Gerencie as configurações das empresas, redes e lojas do sistema. Selecione uma opção abaixo para começar.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Criar Rede */}
            <Card 
              className="border-2 border-emerald-500 hover:border-emerald-600 transition-all cursor-pointer group bg-emerald-50/50 hover:shadow-md hover:-translate-y-0.5"
              onClick={() => router.push("/configuracoes/empresas?view=criar-rede")}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-500 rounded-lg group-hover:bg-emerald-600 transition-colors">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Criar Nova Rede</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Crie uma nova rede para organizar suas lojas. Você poderá criar lojas e associar usuários posteriormente.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-medium text-emerald-600 group-hover:text-emerald-700 transition-colors">
                  <span>Criar Rede</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>

            {/* Alterar Dados */}
            <Card 
              className="border-2 hover:border-emerald-500 transition-all cursor-pointer group hover:shadow-md hover:-translate-y-0.5"
              onClick={() => router.push("/configuracoes/empresas?view=alterar-dados")}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                        <Type className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Alterar Dados</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Altere o nome das empresas ou a logo das redes. As mudanças são aplicadas imediatamente.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-medium text-emerald-600 group-hover:text-emerald-700 transition-colors">
                  <span>Acessar</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>

            {/* Desativar */}
            <Card 
              className="border-2 hover:border-rose-500 transition-all cursor-pointer group hover:shadow-md hover:-translate-y-0.5"
              onClick={() => router.push("/configuracoes/empresas?view=desativar")}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-rose-100 rounded-lg group-hover:bg-rose-200 transition-colors">
                        <Power className="w-5 h-5 text-rose-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Desativar Rede ou Loja</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      <strong className="text-rose-600">ATENÇÃO:</strong> Ao desativar uma rede, TODAS as lojas dessa rede serão desativadas automaticamente.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-medium text-rose-600 group-hover:text-rose-700 transition-colors">
                  <span>Acessar</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>

            {/* Reativar */}
            <Card 
              className="border-2 hover:border-emerald-500 transition-all cursor-pointer group hover:shadow-md hover:-translate-y-0.5"
              onClick={() => router.push("/configuracoes/empresas?view=reativar")}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                        <RotateCcw className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Reativar Rede ou Loja</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Reative uma rede ou loja que foi desativada anteriormente. Ela voltará a aparecer na lista de entidades ativas.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-medium text-emerald-600 group-hover:text-emerald-700 transition-colors">
                  <span>Acessar</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfiguracoesEmpresasContentWrapper() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="grid gap-4 md:grid-cols-2 mt-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ConfiguracoesEmpresasContent />
    </Suspense>
  );
}

export default function ConfiguracoesEmpresasPage() {
  return (
    <DashboardPage
      initialView="configuracoes-empresas"
      extraRoutes={{
        "configuracoes-empresas": {
          title: "Configurações · Empresas",
          path: "/configuracoes/empresas",
          component: <ConfiguracoesEmpresasContentWrapper />,
        },
      }}
    />
  );
}
