import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json();
    
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;
    
    if (!clientToken) {
      return NextResponse.json(
        { error: 'ZAPI_CLIENT_TOKEN não configurado nas variáveis de ambiente' },
        { status: 500 }
      );
    }

    const url = 'https://api.z-api.io/instances/3E5617B992C1A1A44BE92AC1CE4E084C/token/965006A3DBD3AE6A5ACF05EF/send-text';
    
    console.log('🚀 Enviando mensagem via Z-API (API Route)...');
    console.log('URL:', url);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'client-token': clientToken.substring(0, 10) + '...'
    });
    console.log('Body:', {
      phone: phone,
      message: message.substring(0, 50) + '...'
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-token': clientToken
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na API Z-API: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Erro na API Z-API: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Resposta Z-API:', result);
    
    // Z-API pode retornar diferentes formatos de sucesso
    const isSuccess = result.success === true || 
                     result.status === 'success' || 
                     result.status === 'sent' ||
                     result.messageId ||
                     (result.data && result.data.messageId) ||
                     response.status === 200;
    
    console.log('✅ Mensagem enviada com sucesso:', isSuccess);
    
    return NextResponse.json({ 
      success: isSuccess, 
      result: result 
    });

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem via Z-API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

