import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// =============================================================
// Admin: Manage Registration Requests (Approve / Reject / Delete)
// Deploy with: supabase functions deploy manage-registration
// =============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- Verify calling user is an approved Admin ---
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { data: callerProfile } = await supabaseClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Forbidden. Approved admin access required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // --- Parse request ---
    const { action, userId, admin_notes, device_id } = await req.json()

    if (!action || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: action and userId.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'approve') {
      // Update profile status to approved
      const updateData: Record<string, any> = { status: 'approved' }
      if (device_id) updateData.device_id = device_id

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (updateError) throw updateError

      // Mark registration request as reviewed
      await supabaseAdmin
        .from('registration_requests')
        .update({
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: admin_notes || 'Approved',
        })
        .eq('user_id', userId)

      return new Response(JSON.stringify({ success: true, action: 'approved' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (action === 'reject') {
      // Update profile status to rejected
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', userId)

      if (updateError) throw updateError

      // Mark registration request as reviewed with reason
      await supabaseAdmin
        .from('registration_requests')
        .update({
          admin_notes: admin_notes || 'Rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      return new Response(JSON.stringify({ success: true, action: 'rejected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (action === 'delete') {
      // Delete auth user — cascades to profiles and registration_requests
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true, action: 'deleted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use: approve, reject, or delete.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
