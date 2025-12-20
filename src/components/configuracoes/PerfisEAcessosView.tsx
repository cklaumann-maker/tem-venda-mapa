"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GerenciarUsuariosView } from "./GerenciarUsuariosView";
import { GerenciarConvitesView } from "./GerenciarConvitesView";
import { Users, Mail } from "lucide-react";

export function PerfisEAcessosView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Perfis e Acessos</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie usuários e convites do sistema
        </p>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Gerenciar Usuários
          </TabsTrigger>
          <TabsTrigger value="convites" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Gerenciar Convites
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="usuarios" className="mt-6">
          <GerenciarUsuariosView />
        </TabsContent>
        
        <TabsContent value="convites" className="mt-6">
          <GerenciarConvitesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

