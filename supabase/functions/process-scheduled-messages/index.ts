// Supabase Edge Function to process scheduled messages
// Deploy with: supabase functions deploy process-scheduled-messages
// Set up cron with: supabase functions schedule process-scheduled-messages --cron "* * * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find messages where scheduledAt <= now and move them to "sent"
    // We do this by setting scheduledAt to null (making them visible)
    const now = new Date().toISOString();

    const { data: scheduledMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id, content, channelId, userId, scheduledAt')
      .lte('scheduledAt', now)
      .not('scheduledAt', 'is', null);

    if (fetchError) {
      console.error('Error fetching scheduled messages:', fetchError);
      throw fetchError;
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No scheduled messages to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update messages to "publish" them by setting scheduledAt to null
    // and updating createdAt to now (so they appear at the right time)
    const messageIds = scheduledMessages.map((m) => m.id);

    const { error: updateError } = await supabase
      .from('messages')
      .update({
        scheduledAt: null,
        createdAt: now,
      })
      .in('id', messageIds);

    if (updateError) {
      console.error('Error publishing scheduled messages:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${scheduledMessages.length} scheduled messages`,
        processedIds: messageIds,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
