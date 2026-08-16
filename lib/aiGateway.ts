/**
 * Cloudflare AI Gateway — an optional proxy that sits in front of the model
 * providers we already call. The models, keys and request bodies stay exactly
 * the same; only the host changes.
 *
 * What it buys us, without switching models:
 *   - response caching, so a repeated prompt never reaches the provider twice
 *   - one dashboard showing what each AI feature actually costs, which we have
 *     no visibility into today across four providers in three files
 *   - retries and provider fallback when an upstream is down
 *
 * Set CF_AI_GATEWAY_ACCOUNT_ID and CF_AI_GATEWAY_ID to turn it on. Leave either
 * one unset — the default — and every call goes straight to the provider,
 * byte-for-byte as before.
 */

/** Providers we route through the gateway, named as Cloudflare addresses them. */
type Provider = "openai" | "groq" | "google-ai-studio" | "anthropic";

function gatewayBase(): string | null {
  const account = process.env.CF_AI_GATEWAY_ACCOUNT_ID;
  const gateway = process.env.CF_AI_GATEWAY_ID;
  if (!account || !gateway) return null;
  return `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}`;
}

/**
 * The URL to call for one request.
 *
 * @param provider Which upstream this call goes to.
 * @param path     Path after the provider segment, e.g. "chat/completions".
 *                 Note the gateway drops the provider's own version prefix for
 *                 OpenAI-style APIs ("v1/chat/completions" becomes
 *                 "chat/completions") but keeps it for Google AI Studio.
 * @param direct   The provider URL to use when the gateway is not configured.
 */
export function aiUrl(provider: Provider, path: string, direct: string): string {
  const base = gatewayBase();
  if (!base) return direct;
  return `${base}/${provider}/${path.replace(/^\//, "")}`;
}

/** Whether calls are currently being routed through the gateway. */
export function aiGatewayEnabled(): boolean {
  return gatewayBase() !== null;
}
