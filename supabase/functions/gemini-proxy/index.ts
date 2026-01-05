import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, model, config, history, systemInstruction } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }

    // Default to gemini-2.5-flash if not provided. 
    // The user's curl used gemini-2.0-flash, so we can support that too if passed.
    const modelName = model || 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // Construct the payload for the REST API
    let contents = [];
    
    if (history && history.length > 0) {
        // Convert history format if needed, or assume it matches Google's structure
        contents = [...history];
        // Add the new prompt
        contents.push({ role: 'user', parts: [{ text: prompt }] });
    } else {
        contents = [{ role: 'user', parts: [{ text: prompt }] }];
    }

    const payload: any = {
        contents: contents,
        generationConfig: config || {}
    };

    if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    // Call Google API directly
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Extract text from the response structure
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in gemini-proxy:", error);
    return new Response(JSON.stringify({ 
        error: error.message || 'Internal Server Error',
        details: error.toString() 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});