// This function has been deprecated and disabled.
// Video sync functionality is no longer supported.

Deno.serve(async (req) => {
  return new Response(
    JSON.stringify({ 
        success: false, 
        error: 'This feature has been deprecated.' 
    }),
    { status: 410, headers: { 'Content-Type': 'application/json' } }
  )
})