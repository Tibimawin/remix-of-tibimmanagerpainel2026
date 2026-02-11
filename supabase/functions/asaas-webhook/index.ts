import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

// Firebase REST API to update Firestore document
async function updateFirestoreUser(uid: string, newExpiryDate: string, additionalDays: number) {
  const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || 'tibimmanagerpainelvercel';
  const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY');

  if (!FIREBASE_API_KEY) {
    throw new Error('FIREBASE_API_KEY não configurada');
  }

  // Get current user data
  const getUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`;
  const getResponse = await fetch(getUrl);
  
  if (!getResponse.ok) {
    const errText = await getResponse.text();
    throw new Error(`Erro ao buscar usuário: ${errText}`);
  }

  const userData = await getResponse.json();
  const currentAccessDays = userData.fields?.accessDays?.integerValue 
    ? parseInt(userData.fields.accessDays.integerValue) 
    : 0;

  // Update user document
  const updateUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=expiryDate&updateMask.fieldPaths=accessDays&updateMask.fieldPaths=isActive&key=${FIREBASE_API_KEY}`;
  
  const updateResponse = await fetch(updateUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        expiryDate: { stringValue: newExpiryDate },
        accessDays: { integerValue: String(currentAccessDays + additionalDays) },
        isActive: { booleanValue: true },
      }
    }),
  });

  if (!updateResponse.ok) {
    const errText = await updateResponse.text();
    throw new Error(`Erro ao atualizar usuário: ${errText}`);
  }

  // Update userPermissions too
  const permUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/userPermissions/${uid}?updateMask.fieldPaths=expiryDate&updateMask.fieldPaths=isActive&updateMask.fieldPaths=lastUpdated&key=${FIREBASE_API_KEY}`;
  
  await fetch(permUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        expiryDate: { stringValue: newExpiryDate },
        isActive: { booleanValue: true },
        lastUpdated: { stringValue: new Date().toISOString() },
      }
    }),
  });

  console.log(`Usuário ${uid} atualizado: expiryDate=${newExpiryDate}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    const receivedToken = req.headers.get('asaas-access-token');

    // Validate webhook token if configured
    if (webhookToken && receivedToken !== webhookToken) {
      console.error('Token de webhook inválido');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    console.log('Webhook Asaas recebido:', JSON.stringify(payload));

    const { event, payment } = payload;

    // Only process confirmed payments
    if (event !== 'PAYMENT_CONFIRMED' && event !== 'PAYMENT_RECEIVED') {
      console.log(`Evento ignorado: ${event}`);
      return new Response(
        JSON.stringify({ received: true, processed: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payment?.externalReference) {
      console.error('Pagamento sem externalReference (uid)');
      return new Response(
        JSON.stringify({ error: 'Missing externalReference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uid = payment.externalReference;
    const now = new Date();
    const newExpiry = new Date(now);
    newExpiry.setDate(now.getDate() + 30);

    await updateFirestoreUser(uid, newExpiry.toISOString(), 30);

    console.log(`✅ Acesso liberado para ${uid} até ${newExpiry.toISOString()}`);

    return new Response(
      JSON.stringify({ received: true, processed: true, uid, newExpiry: newExpiry.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro no webhook Asaas:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
