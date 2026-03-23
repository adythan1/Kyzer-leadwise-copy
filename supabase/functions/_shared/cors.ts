/**
 * CORS for browser calls via supabase.functions.invoke().
 * Include methods + headers Supabase client may send on preflight.
 */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, accept-profile, content-profile, prefer, x-supabase-authorization, baggage, sentry-trace',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}
