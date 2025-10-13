"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import SectionTitle from "@/components/common/SectionTitle";
import MetasView from "@/components/metas/MetasView";
import { brand } from "@/lib/brand";

export default function VendasView(){
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Vendas — Acompanhamento"
        subtitle="Visualize metas x vendas no formato consolidado do Passo 9."
        iconBg={brand.primary}
      />
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <MetasView mode="acompanhamento" />
        </CardContent>
      </Card>
    </div>
  );
}
