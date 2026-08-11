// @ts-nocheck
// deno-lint-ignore-file

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-key',
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  if (!lat || !lon) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
      headers: {
        'User-Agent': 'BantayApoy/1.0'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.display_name) {
      // Simplify address if possible, else return full
      return data.display_name;
    }
    return null;
  } catch (e) {
    console.error('Geocoding error:', e);
    return null;
  }
}

async function sendTelegram(token: string, chatId: string, text: string) {
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('Telegram error:', e);
    return false;
  }
}

serve(async (req: Request) => {
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
      .select('id, device_code, location_desc, is_active, co_threshold, temp_threshold, bfp_contact')
      .eq('api_key', deviceKey)
      .single()

    if (deviceError || !device || !device.is_active) {
      return new Response(JSON.stringify({ error: 'Unauthorized or inactive device' }), { status: 401, headers: corsHeaders })
    }

    // Update last_seen_at
    await supabaseAdmin.from('devices').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id)

    // 2. Parse body
    const body = await req.json()
    const { tier, co_ppm, temp_celsius, latitude, longitude, gps_valid, on_battery } = body

    if (tier !== 1 && tier !== 2) {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), { status: 400, headers: corsHeaders })
    }

    // 3. Insert into sensor_readings
    await supabaseAdmin.from('sensor_readings').insert({
      device_id: device.id,
      co_ppm,
      temp_celsius,
      latitude,
      longitude,
      gps_valid: gps_valid ?? false,
      on_battery: on_battery ?? false,
      sensor_ready: true, // If it's an alert, sensor_ready must be true
    })

    // 4. Reverse Geocode Address
    const address_resolved = (gps_valid && latitude && longitude) 
      ? await reverseGeocode(latitude, longitude) 
      : null;

    const locationString = address_resolved || device.location_desc;
    const timeString = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 5. Send Telegram Notification
    const tgToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
    const tgChatId = Deno.env.get('TELEGRAM_CHAT_ID') || '';
    
    let tgText = '';
    if (tier === 1) {
      tgText = `WARNING — Tier 1\n\nDevice: ${device.device_code}\nLocation: ${locationString}\nTime: ${timeString}\n\nElevated reading detected:\n- CO: ${co_ppm} ppm (threshold: ${device.co_threshold} ppm)\n- Temp: ${temp_celsius}°C (threshold: ${device.temp_threshold}°C)\n\nMonitor the area. No SMS dispatched at this level.`;
    } else {
      const gpsString = (gps_valid && latitude && longitude) ? `GPS: ${latitude}, ${longitude}\nNavigate: https://maps.google.com/?q=${latitude},${longitude}\n\n` : `GPS: Unavailable\n\n`;
      tgText = `FIRE ALERT — Tier 2\n\nDevice: ${device.device_code}\nLocation: ${locationString}\nTime: ${timeString}\n\nSensor readings:\n- CO: ${co_ppm} ppm (threshold: ${device.co_threshold} ppm)\n- Temp: ${temp_celsius}°C (threshold: ${device.temp_threshold}°C)\n\n${gpsString}SMS alerts have been dispatched.`;
    }

    const telegramSent = await sendTelegram(tgToken, tgChatId, tgText);

    // 6. Insert into alert_events
    await supabaseAdmin.from('alert_events').insert({
      device_id: device.id,
      alert_tier: tier,
      co_ppm,
      temp_celsius,
      latitude,
      longitude,
      gps_valid: gps_valid ?? false,
      address_resolved,
      telegram_sent: telegramSent,
      // sms_sent fields are updated later or handled by the device in terms of "dispatch sent"
      // but according to the backend behavior, the backend doesn't know if SMS succeeded on device,
      // so we might set them to true if tier 2 since the device will try to send them.
      sms_sent_owner: tier === 2,
      sms_sent_bfp: tier === 2,
    })

    // 7. Get resident contact if tier 2
    let ownerContact = '';
    if (tier === 2) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('contact_number')
        .eq('device_id', device.id)
        .eq('role', 'resident')
        .single()
      
      if (profileData && profileData.contact_number) {
        ownerContact = profileData.contact_number;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      owner_contact: ownerContact,
      bfp_contact: device.bfp_contact || ''
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
