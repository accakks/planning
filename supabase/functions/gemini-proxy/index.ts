import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

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

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Explicitly using gemini-1.5-flash as it's the current standard and widely supported
    const modelName = 'gemini-1.5-flash';
    
    const generativeModel = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction
    });
    
    let text = '';
    
    if (history && history.length > 0) {
        // Chat Mode
        const chat = generativeModel.startChat({
            history: history,
            generationConfig: config
        });
        const result = await chat.sendMessage(prompt);
        text = result.response.text();
    } else {
        // Single Generate Mode
        const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: config
        });
        text = result.response.text();
    }

    const data = {
      text: text,
    };

    return new Response(JSON.stringify(data), {
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