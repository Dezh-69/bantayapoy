import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-key',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const deviceKey = req.headers.get('x-device-key')
    if (!deviceKey) {
      return new Response(JSON.stringify({ error: 'Missing x-device-key' }), { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Authenticate device
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('id, is_active, co_threshold, temp_threshold')
      .eq('api_key', deviceKey)
      .single()

    if (deviceError || !device || !device.is_active) {
      return new Response(JSON.stringify({ error: 'Unauthorized or inactive device' }), { status: 401, headers: corsHeaders })
    }

    // Update last_seen_at
    await supabaseAdmin.from('devices').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id)

    // 2. Parse body
    const body = await req.json()
    const { co_ppm, temp_celsius, latitude, longitude, gps_valid, on_battery, sensor_ready } = body

    // 3. Insert into sensor_readings
    const { error: insertError } = await supabaseAdmin.from('sensor_readings').insert({
      device_id: device.id,
      co_ppm,
      temp_celsius,
      latitude,
      longitude,
      gps_valid: gps_valid ?? false,
      on_battery: on_battery ?? false,
      sensor_ready: sensor_ready ?? true,
    })

    if (insertError) throw insertError

    // 4. Auto-resolution logic (only if sensor is ready and below thresholds)
    if (sensor_ready !== false) {
      if (co_ppm <= device.co_threshold && temp_celsius <= device.temp_threshold) {
        // Close any open alert for this device
        await supabaseAdmin
          .from('alert_events')
          .update({ resolved_at: new Date().toISOString() })
          .eq('device_id', device.id)
          .is('resolved_at', null)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
