// Type stand-ins so the edge functions can be type-checked with tsc (no Deno here).
declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}
