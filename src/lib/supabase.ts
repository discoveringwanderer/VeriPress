import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/rest\/v1\/?$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const performanceFetch: typeof fetch = async (input, init) => {
  const startedAt = performance.now();
  const request = input instanceof Request ? input : null;
  const url = request?.url ?? input.toString();
  const method = init?.method ?? request?.method ?? "GET";

  try {
    const response = await fetch(input, init);
    const durationMs = Math.round(performance.now() - startedAt);
    if (durationMs >= 1000) {
      console.warn("[VeriPress performance] Slow Supabase request", {
        method,
        endpoint: new URL(url).pathname,
        status: response.status,
        durationMs,
      });
    }
    return response;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    console.error("[VeriPress performance] Supabase request failed", {
      method,
      endpoint: new URL(url).pathname,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: performanceFetch },
});
