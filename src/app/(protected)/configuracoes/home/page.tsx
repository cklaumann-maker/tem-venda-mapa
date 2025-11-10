"use client";

import { useMemo, useState } from "react";
import { DashboardPage } from "../../page";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Info, ListChecks, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

function InlineBadge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium uppercase tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}

type WidgetPreset = {
  id: string;
  title: string;
  description: string;
  defaultEnabled: boolean;
  personalizationHints: string[];
};

const presetWidgets: WidgetPreset[] = [
  {
    id: "kpis-diarios",
    title: "KPIs diários",
    description: "Vendas do dia, ticket médio, clientes atendidos e meta diária.",
    defaultEnabled: true,
    personalizationHints: [
      "Intervalo de comparação (ontem, média da semana, meta diária).",
      "Fonte de dados (ERP, Supabase, planilha manual).",
      "Alertas automáticos quando qualquer indicador fugir ±10%.",
    ],
  },
  {
    id: "pulse-equipe",
    title: "Pulso da equipe",
    description: "Status da escala, presença e destaques por colaborador.",
    defaultEnabled: true,
    personalizationHints: [
      "Destacar líderes por categoria (ex.: vendas de OTC).",
      "Permitir notas rápidas do farmacêutico responsável.",
      "Integração com check-in digital ou planilha de RH.",
    ],
  },
  {
    id: "estoque-inteligente",
    title: "Estoque inteligente",
    description: "Itens críticos, ruptura e cobertura de dias por categoria.",
    defaultEnabled: false,
    personalizationHints: [
      "Configurar categorias vitais (psicóticos, antibióticos, dermo).",
      "Mostrar curva ABC por margem ou giro.",
      "Sincronizar com metas de compra/compromissos com distribuidoras.",
    ],
  },
  {
    id: "campanhas-vigentes",
    title: "Campanhas vigentes",
    description: "Desempenho das campanhas comerciais e de CRM em tempo real.",
    defaultEnabled: false,
    personalizationHints: [
      "Comparar meta versus realizado por campanha.",
      "Inserir checklist de merchandising (banner, ponta de gôndola).",
      "Ligar com metas individuais dos balconistas.",
    ],
  },
  {
    id: "clube-fidelidade",
    title: "Clube de fidelidade",
    description: "Acompanhamento de cadastro, recompensas e churn.",
    defaultEnabled: false,
    personalizationHints: [
      "Meta de cadastros por dia/semana.",
      "Sinalizar clientes que não retornam há +30 dias.",
      "Integrar com campanhas de SMS/Z-API.",
    ],
  },
  {
    id: "saude-financeira",
    title: "Saúde financeira",
    description: "Custos, CMV, margem bruta, DRE simplificado e fluxo projetado.",
    defaultEnabled: false,
    personalizationHints: [
      "Exibir D+1 com dados provisionados pelo financeiro.",
      "Destacar dias que precisam de ações de margem (ex.: incremento em genéricos).",
      "Adicionar gatilhos de alerta (margem < 29%).",
    ],
  },
  {
    id: "compliance-farmaceutico",
    title: "Compliance farmacêutico",
    description: "Documentos, controles de psicotrópicos, validade de receituários.",
    defaultEnabled: false,
    personalizationHints: [
      "Conectar com checklist diário da vigilância sanitária.",
      "Notificar documentos vencendo em 7 dias.",
      "Registrar pendências por turno e responsável.",
    ],
  },
  {
    id: "humor-da-equipe",
    title: "Humor da equipe",
    description: "Pesquisas rápidas de clima para acompanhar moral do time.",
    defaultEnabled: false,
    personalizationHints: [
      "Pulse semanal com emoji (1-5).",
      "Permitir comentários anônimos para o gestor.",
      "Exibir recomendações automáticas de endomarketing.",
    ],
  },
  {
    id: "proximos-pasos",
    title: "Próximos passos",
    description: "Checklist executivo personalizado com foco em decisão diária.",
    defaultEnabled: true,
    personalizationHints: [
      "Sugestões baseadas nos widgets ativados (ex.: campanha abaixo da meta → renegociar bônus).",
      "Integração com plano de ação do Trello/Notion.",
      "Campos para priorizar ações por impacto (alta, média, baixa).",
    ],
  },
];

function ConfiguracoesHomeContent() {
  const { stores, isAdmin, currentStore } = useStore();
  const [storeId, setStoreId] = useState<string>(currentStore?.id ?? "");
  const [activeWidgets, setActiveWidgets] = useState<Record<string, boolean>>(() =>
    presetWidgets.reduce((acc, widget) => ({ ...acc, [widget.id]: widget.defaultEnabled }), {})
  );
  const [layoutOption, setLayoutOption] = useState<string>("padrao");
  const [widgetNotes, setWidgetNotes] = useState<Record<string, string>>(() =>
    presetWidgets.reduce((acc, widget) => ({ ...acc, [widget.id]: "" }), {})
  );
  const [refreshInterval, setRefreshInterval] = useState<string>("15");

  const storeName = useMemo(() => {
    const store = stores.find((item) => item.id === storeId) ?? currentStore;
    return store?.name ?? "sua loja";
  }, [storeId, stores, currentStore]);

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-dashed border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Info className="w-5 h-5 text-emerald-600" />
              Acesso exclusivo para administradores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Somente usuários com perfil de administrador podem personalizar a página inicial.</p>
            <p>
              Caso precise de alterações, solicite ao responsável da rede ou abra um chamado com a equipe TEM VENDA para
              avaliarmos a configuração ideal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-emerald-600" />
          Personalização da página inicial
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ajuste os widgets exibidos para cada empresa e ofereça ao gestor uma visão sob medida. A área hero (logo,
          saudação e metas principais) permanece padrão para garantir consistência de marca.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Empresa</CardTitle>
              <CardDescription>Escolha qual loja você deseja personalizar agora.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="md:w-72">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <InlineBadge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
              Configuração individual por empresa
            </InlineBadge>
            <InlineBadge className="border border-slate-200 text-slate-600">Hero padrão e não editável</InlineBadge>
            <InlineBadge className="border border-slate-200 text-slate-600">Widgets personalizáveis por gestor</InlineBadge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="col-span-3 md:col-span-1">
              <Label className="text-sm font-semibold text-gray-900">Layout base</Label>
              <CardDescription className="text-xs">Escolha um layout de referência para {storeName}.</CardDescription>
            </div>
            <div className="col-span-3 md:col-span-2 flex flex-col gap-3">
              <Select value={layoutOption} onValueChange={setLayoutOption}>
                <SelectTrigger className="md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao">Layout TEM VENDA (padrão)</SelectItem>
                  <SelectItem value="foco-vendas">Foco em vendas (widgets de performance primeiro)</SelectItem>
                  <SelectItem value="foco-equipe">Foco em equipe (bem-estar e escala em destaque)</SelectItem>
                  <SelectItem value="financeiro">Painel financeiro (KPIs e fluxo de caixa em destaque)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground leading-snug">
                Você pode combinar o layout base com widgets personalizados. O layout define a ordem inicial e as colunas.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="col-span-3 md:col-span-1">
              <Label className="text-sm font-semibold text-gray-900">Atualização automática</Label>
              <CardDescription className="text-xs">
                Defina o intervalo padrão de atualização dos widgets com dados dinâmicos.
              </CardDescription>
            </div>
            <div className="col-span-3 md:col-span-2 flex items-center gap-3">
              <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">A cada 5 minutos</SelectItem>
                  <SelectItem value="15">A cada 15 minutos</SelectItem>
                  <SelectItem value="30">A cada 30 minutos</SelectItem>
                  <SelectItem value="manual">Somente manual</SelectItem>
                </SelectContent>
              </Select>
              <Input className="w-32" placeholder="API/Query" />
              <p className="text-xs text-muted-foreground">
                Informe um identificador de origem (ex.: view_supabase_kpis_diarios).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-emerald-600" />
            Biblioteca de widgets
          </CardTitle>
          <CardDescription>
            Ative ou desative itens, ajuste prioridades e registre particularidades de cada rede.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {presetWidgets.map((widget) => (
            <div
              key={widget.id}
              className={`rounded-2xl border ${
                activeWidgets[widget.id] ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-white"
              } p-4 space-y-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`widget-${widget.id}`}
                      checked={activeWidgets[widget.id]}
                      onCheckedChange={(value) =>
                        setActiveWidgets((prev) => ({ ...prev, [widget.id]: Boolean(value) }))
                      }
                    />
                    <Label htmlFor={`widget-${widget.id}`} className="text-sm font-semibold text-gray-900">
                      {widget.title}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 pl-7">{widget.description}</p>
                </div>
                {widget.defaultEnabled && (
                  <InlineBadge className="bg-white text-emerald-600 border border-emerald-200">Sugerido</InlineBadge>
                )}
              </div>
              <div className="pl-7 space-y-1">
                {widget.personalizationHints.map((hint, index) => (
                  <p key={index} className="text-xs text-emerald-700 flex gap-1 items-start">
                    <Sparkles className="w-3 h-3 mt-[2px] flex-shrink-0" />
                    {hint}
                  </p>
                ))}
              </div>
              <Textarea
                placeholder="Observações específicas desta empresa (ex.: destacar estoque de psicotrópicos)."
                className="mt-2"
                rows={2}
                value={widgetNotes[widget.id] ?? ""}
                onChange={(event) =>
                  setWidgetNotes((prev) => ({
                    ...prev,
                    [widget.id]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Checklist de publicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Defina os widgets prioritários para {storeName} e salve as preferências.</li>
            <li>Conecte as fontes de dados no Supabase (views, stored procedures ou integrações externas).</li>
            <li>
              Valide o layout no painel principal e envolva o gestor da loja para garantir aderência às metas locais.
            </li>
            <li>Configure alertas automáticos (Z-API, e-mail ou painel de ações) conforme widgets selecionados.</li>
          </ol>
          <p className="text-xs">
            Em breve adicionaremos persistência direta das configurações (JSON por loja) e pré-visualização com drag &amp;
            drop. Se desejar antecipar a implementação, registre as necessidades em <strong>Notas</strong> e acione a
            equipe TEM VENDA.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled className="cursor-not-allowed">
              Salvar configuração (em breve)
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:produto@temvenda.com.br?subject=Personalização%20de%20widgets">
                Solicitar widget personalizado
              </a>
            </Button>
            <Button variant="ghost" className="flex items-center gap-1 text-emerald-700" asChild>
              <a href="/painel-classico">
                Ver painel atual
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfiguracoesHomePage() {
  return (
    <DashboardPage
      initialView="configuracoes-home"
      extraRoutes={{
        "configuracoes-home": {
          title: "Configurações · Página inicial",
          path: "/configuracoes/home",
          component: <ConfiguracoesHomeContent />,
        },
      }}
    />
  );
}

