import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const HEADERS = {
    "x-api-key": ANTHROPIC_API_KEY,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01"
};

/**
 * Generate detailed image descriptions using Claude from a list of prompts.
 * Since Claude cannot generate images, this creates detailed descriptions
 * that could be used with other image generation services.
 * 
 * @param {string[]} prompts - Array of text prompts for image description
 * @param {string} maxTokens - Maximum tokens for response (default: 1000)
 * @returns {Promise<string[]>} Array of detailed image descriptions or error messages
 */
export const generateImageDescriptionsFromPrompts = async (prompts, maxTokens = 1000) => {
    if (!ANTHROPIC_API_KEY) {
        throw new Error("Claude API key not configured");
    }

    const results = [];

    for (const prompt of prompts) {
        const payload = {
            model: "claude-3-sonnet-20240229",
            max_tokens: maxTokens,
            messages: [
                {
                    role: "user",
                    content: `Create a detailed, vivid image description based on this prompt: "${prompt}". Include visual details like colors, lighting, composition, style, and atmosphere that would help an artist or image generator create the scene.`
                }
            ]
        };

        try {
            const response = await axios.post(CLAUDE_API_URL, payload, {
                headers: HEADERS
            });

            const description = response.data.content[0].text;
            results.push(description);

        } catch (error) {
            if (error.response) {
                // HTTP error response
                const status = error.response.status;
                const errorText = error.response.data?.error?.message ||
                    error.response.statusText ||
                    JSON.stringify(error.response.data);
                results.push(`Error ${status}: ${errorText}`);
            } else if (error.request) {
                // Network error
                results.push(`Network Error: ${error.message}`);
            } else {
                // General error
                results.push(`Error: ${error.message}`);
            }
        }
    }

    return results;
}

/**
 * Alternative: Generate prompts optimized for image generation services
 * Takes basic prompts and enhances them with Claude's help
 * 
 * @param {string[]} basicPrompts - Array of basic text prompts
 * @returns {Promise<string[]>} Array of enhanced prompts for image generation
 */
export const enhancePromptsForImageGeneration = async (basicPrompts) => {
    if (!ANTHROPIC_API_KEY) {
        throw new Error("Claude API key not configured");
    }

    const results = [];

    for (const prompt of basicPrompts) {
        const payload = {
            model: "claude-3-sonnet-20240229",
            max_tokens: 500,
            messages: [
                {
                    role: "user",
                    content: `Take this basic image prompt and enhance it for DALL-E or Midjourney: "${prompt}". Add specific visual details, art style, lighting, and technical parameters that would produce a high-quality image. Keep it concise but detailed.`
                }
            ]
        };

        try {
            const response = await axios.post(CLAUDE_API_URL, payload, {
                headers: HEADERS
            });

            const enhancedPrompt = response.data.content[0].text;
            results.push(enhancedPrompt);

        } catch (error) {
            if (error.response) {
                const status = error.response.status;
                const errorText = error.response.data?.error?.message ||
                    error.response.statusText ||
                    JSON.stringify(error.response.data);
                results.push(`Error ${status}: ${errorText}`);
            } else if (error.request) {
                results.push(`Network Error: ${error.message}`);
            } else {
                results.push(`Error: ${error.message}`);
            }
        }
    }

    return results;
}
