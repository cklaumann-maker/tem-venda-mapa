"use client";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import SectionTitle from "@/components/common/SectionTitle";
import { brand } from "@/lib/brand";
import { ShoppingBasket } from "lucide-react";

/**
 * VendasView — Acompanhamento do movimento da loja
 * Shell independente para evoluirmos o dashboard de acompanhamento
 * sem depender do fluxo interno do MetasView.
 */
export default function VendasView(){
  const [scope, setScope] = useState<"empresa"|"loja"|"cidade"|"estado">("empresa");
  const [key, setKey] = useState<string>("");
  const [yearOpen, setYearOpen] = useState<boolean>(false);

  // TODO: integrar com suas fontes (ex.: vendas do dia/mês, metas do mês/ano, etc.)
  // Por enquanto, placeholders para estrutura e layout.
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Vendas — Acompanhamento"
        subtitle="Acompanhe o movimento da loja e compare com suas metas."
        icon={ShoppingBasket}
        iconBg={brand.primary}
      />

      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <Label>Escopo</Label>
              <Select value={scope} onValueChange={(v:any)=>{ setScope(v); setKey(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o escopo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                  <SelectItem value="estado">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope!=="empresa" && (
              <div>
                <Label>Chave</Label>
                <Select value={key} onValueChange={(v:any)=>setKey(v)}>
                  <SelectTrigger><SelectValue placeholder={`Escolha a ${scope}`} /></SelectTrigger>
                  <SelectContent>
                    {/* TODO: popular com opções reais */}
                    <SelectItem value="EXEMPLO">EXEMPLO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end">
              <Button variant="outline" onClick={()=>setYearOpen(v=>!v)}>
                {yearOpen ? "Ocultar ano" : "Ver ano"}
              </Button>
            </div>
          </div>

          {/* KPIs topo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Venda do dia", value: "—" },
              { label: "Meta do dia", value: "—" },
              { label: "Venda do mês", value: "—" },
              { label: "Meta do mês", value: "—" },
            ].map((k)=> (
              <div key={k.label} className="rounded-xl border p-3 bg-white">
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-lg font-semibold">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Cards mensais (placeholder) */}
          <div className="rounded-2xl border p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Ano atual — consolidação mensal</div>
              <div className="text-xs text-muted-foreground">Clique no mês para detalhar</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Array.from({length:12},(_,i)=>i+1).map((m)=> (
                <div key={m} className="rounded-lg border p-2 bg-gray-50">
                  <div className="text-sm font-medium">Mês {m}</div>
                  <div className="text-xs text-muted-foreground">Venda: —</div>
                  <div className="text-xs text-muted-foreground">Meta: —</div>
                  <div className="text-xs text-muted-foreground">% Ating.: —</div>
                </div>
              ))}
            </div>
          </div>

          {/* Seções futuras */}
          <div className="rounded-2xl border p-3 bg-white">
            <div className="text-sm font-semibold mb-1">Semanas do mês (Dom→Sáb)</div>
            <div className="text-xs text-muted-foreground">Em breve: detalhamento semanal e diário por escopo.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
