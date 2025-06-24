import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_API_URL = "https://api.openai.com/v1/images/generations";

const CLAUDE_HEADERS = {
    "x-api-key": ANTHROPIC_API_KEY,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01"
};

const OPENAI_HEADERS = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json"
};

// Claude: Generate vivid descriptions
export const generateImageDescriptionsFromPrompts = async (prompts, maxTokens = 1000) => {
    if (!ANTHROPIC_API_KEY) throw new Error("Claude API key not configured");

    const results = [];

    for (const prompt of prompts) {
        const payload = {
            model: "claude-3-sonnet-20240229",
            max_tokens: maxTokens,
            messages: [
                {
                    role: "user",
                    content: `Create a detailed, vivid image description based on this prompt: "${prompt}". Include visual details like colors, lighting, composition, style, and atmosphere.`
                }
            ]
        };

        try {
            const response = await axios.post(CLAUDE_API_URL, payload, {
                headers: CLAUDE_HEADERS
            });
            const description = response.data.content[0].text;
            results.push(description);
        } catch (error) {
            results.push(`Error: ${error.message}`);
        }
    }

    return results;
};

// Claude: Enhance prompts for image models
export const enhancePromptsForImageGeneration = async (basicPrompts) => {
    if (!ANTHROPIC_API_KEY) throw new Error("Claude API key not configured");

    const results = [];

    for (const prompt of basicPrompts) {
        const payload = {
            model: "claude-3-sonnet-20240229",
            max_tokens: 500,
            messages: [
                {
                    role: "user",
                    content: `Take this basic image prompt and enhance it for DALL-E or Midjourney: "${prompt}". Add specific visual details, art style, lighting, and technical parameters.`
                }
            ]
        };

        try {
            const response = await axios.post(CLAUDE_API_URL, payload, {
                headers: CLAUDE_HEADERS
            });
            const enhancedPrompt = response.data.content[0].text;
            results.push(enhancedPrompt);
        } catch (error) {
            results.push(`Error: ${error.message}`);
        }
    }

    return results;
};

// OpenAI: Generate image from enhanced prompt
export const generateImages = async (prompts, n = 1, size = "1024x1024") => {
    if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

    const results = [];

    for (const prompt of prompts) {
        const payload = {
            prompt,
            n,
            size
        };

        try {
            const response = await axios.post(OPENAI_IMAGE_API_URL, payload, {
                headers: OPENAI_HEADERS
            });
            const imageUrls = response.data.data.map(img => img.url);
            results.push(...imageUrls);
        } catch (error) {
            results.push(`Error: ${error.message}`);
        }
    }

    return results;
};
