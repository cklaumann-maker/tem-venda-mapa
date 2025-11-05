"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Settings, 
  Target, 
  BarChart3, 
  Play, 
  CheckCircle,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

// ==================== Types ====================
interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'current' | 'completed';
}

interface MetasWizardProps {
  children: React.ReactNode;
  currentStep: number;
  onStepChange: (step: number) => void;
  totalSteps: number;
}

// ==================== Component ====================
export default function MetasWizard({ 
  children, 
  currentStep, 
  onStepChange, 
  totalSteps 
}: MetasWizardProps) {
  const steps: Step[] = [
    {
      id: 1,
      title: "Importar Dados",
      description: "Carregue o histórico de vendas",
      icon: <Upload className="w-5 h-5" />,
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 2,
      title: "Configurar Índices",
      description: "Defina inflação, CMED e crescimento",
      icon: <Settings className="w-5 h-5" />,
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 3,
      title: "Definir Pesos",
      description: "Configure distribuição por loja/cidade",
      icon: <Target className="w-5 h-5" />,
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending'
    },
    {
      id: 4,
      title: "Distribuir Metas",
      description: "Ajuste metas mensais e diárias",
      icon: <BarChart3 className="w-5 h-5" />,
      status: currentStep === 4 ? 'current' : currentStep > 4 ? 'completed' : 'pending'
    },
    {
      id: 5,
      title: "Simular Cenários",
      description: "Compare cenários A e B",
      icon: <Play className="w-5 h-5" />,
      status: currentStep === 5 ? 'current' : currentStep > 5 ? 'completed' : 'pending'
    },
    {
      id: 6,
      title: "Revisar & Salvar",
      description: "Confirme e grave no banco",
      icon: <CheckCircle className="w-5 h-5" />,
      status: currentStep === 6 ? 'current' : currentStep > 6 ? 'completed' : 'pending'
    }
  ];

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-6">
      {/* PROGRESS BAR */}
      <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-r from-green-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configuração de Metas</h2>
              <p className="text-sm text-gray-600">Passo {currentStep} de {totalSteps}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(progress)}%
              </div>
              <div className="text-xs text-gray-500">Concluído</div>
            </div>
          </div>
          
          <Progress value={progress} className="h-2 mb-4" />
          
          {/* STEPS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${
                  step.status === 'completed' 
                    ? 'bg-green-100 text-green-700' 
                    : step.status === 'current'
                    ? 'bg-blue-100 text-blue-700 shadow-lg'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className={`p-2 rounded-full mb-2 ${
                  step.status === 'completed' 
                    ? 'bg-green-200' 
                    : step.status === 'current'
                    ? 'bg-blue-200'
                    : 'bg-gray-200'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="text-xs font-medium text-center">{step.title}</div>
                <div className="text-xs text-center opacity-75 hidden md:block">
                  {step.description}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => onStepChange(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Anterior
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Passo {currentStep} de {totalSteps}
          </span>
        </div>
        
        <Button
          onClick={() => onStepChange(Math.min(totalSteps, currentStep + 1))}
          disabled={currentStep === totalSteps}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          Próximo
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* CONTENT */}
      <div className="min-h-[600px]">
        {children}
      </div>
    </div>
  );
}


