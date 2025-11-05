"use client";
import React, { useState } from "react";

// ==================== Types ====================
interface ZApiMessage {
  phone: string;
  message: string;
}

interface ZApiFormNotificationData {
  formTitle: string;
  employeeName: string;
  responses: Record<string, any>;
  questions: Array<{ id: string; title: string; type: string }>;
}

// ==================== Z-API Service ====================
export class ZApiService {
  async sendMessage(message: ZApiMessage): Promise<boolean> {
    try {
      console.log('🚀 Enviando mensagem via Z-API (API Route)...');
      console.log('Body:', {
        phone: message.phone,
        message: message.message.substring(0, 50) + '...'
      });

      const response = await fetch('/api/zapi/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: message.phone,
          message: message.message
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Erro na API Z-API: ${response.status} - ${errorData.error}`);
        throw new Error(`Erro na API Z-API: ${response.status} - ${errorData.error}`);
      }

      const result = await response.json();
      console.log('✅ Resposta Z-API:', result);
      
      console.log('✅ Mensagem enviada com sucesso:', result.success);
      return result.success;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem via Z-API:', error);
      return false;
    }
  }

  async sendFormNotification(formData: ZApiFormNotificationData, managerPhone?: string): Promise<boolean> {
    const message = this.formatFormMessage(formData);
    const phone = managerPhone || '5551982813505';
    
    return this.sendMessage({
      phone: phone,
      message: message
    });
  }

  private formatFormMessage(formData: ZApiFormNotificationData): string {
    const { formTitle, employeeName, responses, questions } = formData;
    
    const timestamp = new Date().toLocaleString('pt-BR');
    
    let message = `📋 *Nova Resposta de Formulário*\n\n`;
    message += `*Formulário:* ${formTitle}\n`;
    message += `*Funcionário:* ${employeeName}\n`;
    message += `*Data:* ${timestamp}\n\n`;
    message += `*Respostas:*\n`;

    Object.entries(responses).forEach(([questionId, value]) => {
      const question = questions.find(q => q.id === questionId);
      const questionTitle = question?.title || questionId;
      
      let formattedValue = '';
      if (Array.isArray(value)) {
        formattedValue = value.join(', ');
      } else {
        formattedValue = String(value);
      }
      
      message += `• ${questionTitle}: ${formattedValue}\n`;
    });

    return message;
  }

  // Método para teste rápido
  async sendTestMessage(phone?: string): Promise<boolean> {
    const testPhone = phone || '5551982813505';
    const testMessage = `🧪 TESTE Z-API

✅ No ar.

Data: ${new Date().toLocaleString('pt-BR')}`;
    
    return this.sendMessage({
      phone: testPhone,
      message: testMessage
    });
  }
}

// ==================== Hook para Z-API ====================
export function useZApi() {
  const [isLoading, setIsLoading] = useState(false);

  const sendFormNotification = async (formData: ZApiFormNotificationData, managerPhone?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const zapiService = new ZApiService();
      const success = await zapiService.sendFormNotification(formData, managerPhone);
      return success;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async (phone?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const zapiService = new ZApiService();
      const success = await zapiService.sendTestMessage(phone);
      return success;
    } catch (error) {
      console.error('Erro no teste de conexão:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    sendFormNotification,
    testConnection
  };
}