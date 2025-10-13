/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Org = { id: string; name: string };
type Store = { id: string; name: string; org_id: string };

export default function Page() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Carrega ORGS ao montar
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orgs")
        .select("id,name")
        .order("name", { ascending: true });

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as Org[];
      setOrgs(list);
      setSelectedOrgId(list[0]?.id ?? null);
      setLoading(false);
    })();
  }, []);

  // Carrega STORES quando trocar a org
  useEffect(() => {
    if (!selectedOrgId) {
      setStores([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,org_id")
        .eq("org_id", selectedOrgId)
        .order("name", { ascending: true });

      if (error) {
        setErr(error.message);
        return;
      }
      setStores((data ?? []) as Store[]);
    })();
  }, [selectedOrgId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <p className="text-sm text-zinc-400">Carregando...</p>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <p className="text-red-500">Erro: {err}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mapa Comercial TEM VENDA</h1>
        <div className="flex items-center gap-3">
          <Select
            value={selectedOrgId ?? ""}
            onValueChange={(v) => setSelectedOrgId(v)}
          >
            <SelectTrigger className="w-[260px] bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Selecione a organização" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-500"
            onClick={() => window.location.reload()}
          >
            Atualizar
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Organizações</h2>
            <ul className="space-y-2">
              {orgs.map((o) => (
                <li
                  key={o.id}
                  className={`rounded border p-3 ${
                    o.id === selectedOrgId
                      ? "border-emerald-600 bg-emerald-600/10"
                      : "border-zinc-800"
                  }`}
                >
                  {o.name}
                </li>
              ))}
            </ul>
            {orgs.length === 0 && (
              <p className="text-sm text-zinc-400 mt-2">
                Nenhuma organização encontrada.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Lojas da organização</h2>
            <ul className="space-y-2">
              {stores.map((s) => (
                <li key={s.id} className="rounded border border-zinc-800 p-3">
                  {s.name}
                </li>
              ))}
            </ul>
            {selectedOrgId && stores.length === 0 && (
              <p className="text-sm text-zinc-400 mt-2">
                Nenhuma loja para esta organização.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
