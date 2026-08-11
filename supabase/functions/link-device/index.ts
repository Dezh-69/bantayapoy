import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Verify calling user is authenticated Resident
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, device_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'resident') {
      return new Response(JSON.stringify({ error: 'Forbidden. Resident access required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 2. Parse request body
    const { device_code } = await req.json()

    if (!device_code) {
      return new Response(JSON.stringify({ error: 'Device code is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 3. Look up device and update the user using service role key (bypassing RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Find device
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('device_code', device_code)
      .single()
      
    if (deviceError || !device) {
      return new Response(JSON.stringify({ error: 'Device not found. Please check the code and try again.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }
    
    // Check if device is already assigned to someone else
    const { data: existingProfiles, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('device_id', device.id)
      
    if (pError) throw pError;
    
    if (existingProfiles && existingProfiles.length > 0 && existingProfiles[0].id !== user.id) {
       return new Response(JSON.stringify({ error: 'This device is already registered to another account.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409,
      })
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ device_id: device.id })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, profile: updatedProfile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
