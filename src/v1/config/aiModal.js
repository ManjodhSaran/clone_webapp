const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const HEADERS = {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
};

const ALLOWED_MODELS = [
    // Claude 3 (Anthropic)
    "claude-3-haiku-20240307",     // Fastest, cheapest
    "claude-3-sonnet-20240229",    // Balanced
    "claude-3-opus-20240229",      // Most powerful

    // Claude 2 series (legacy)
    "claude-2.1",                  // Older Anthropic model
    "claude-instant-1.2",          // Lightweight, lower-latency Claude 2 version

    // GPT-4 / OpenAI (if added in future)
    "gpt-4o",                      // GPT-4 Omni (multimodal, best value)
    "gpt-4-turbo",                 // Turbo GPT-4
    "gpt-4",                       // Original GPT-4
    "gpt-3.5-turbo",               // Fast, cheaper model for lighter use

    // Google Gemini (if supported later)
    "gemini-1.5-pro",              // Gemini's current best
    "gemini-1.0-pro",

    // Mistral / Mixtral (open source contenders)
    "mistral-7b-instruct",
    "mixtral-8x7b",

    // Meta LLaMA models (useful for local/private deployments)
    "llama-3-70b",
    "llama-3-8b"
];