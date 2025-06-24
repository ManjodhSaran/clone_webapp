import axios from 'axios';
import { config } from '../config/index.js';

const CLAUDE_HEADERS = {
  "x-api-key": config.ai.anthropicApiKey,
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01"
};

const OPENAI_HEADERS = {
  "Authorization": `Bearer ${config.ai.openaiApiKey}`,
  "Content-Type": "application/json"
};

export const generateImageDescriptionsFromPrompts = async (prompts, maxTokens = 1000) => {
  if (!config.ai.anthropicApiKey) throw new Error("Claude API key not configured");

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
      const response = await axios.post(config.ai.anthropicApiUrl, payload, {
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

export const enhancePromptsForImageGeneration = async (basicPrompts) => {
  if (!config.ai.anthropicApiKey) throw new Error("Claude API key not configured");

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
      const response = await axios.post(config.ai.anthropicApiUrl, payload, {
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

export const generateImages = async (prompts, n = 1, size = "1024x1024") => {
  if (!config.ai.openaiApiKey) throw new Error("OpenAI API key not configured");

  const results = [];

  for (const prompt of prompts) {
    const payload = { prompt, n, size };

    try {
      const response = await axios.post(config.ai.openaiImageApiUrl, payload, {
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