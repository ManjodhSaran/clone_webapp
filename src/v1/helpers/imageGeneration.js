import axios from 'axios';
import { config } from '../config/index.js';


import { OpenAI } from 'openai';


// Claude: Generate vivid descriptions
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
            const response = await axios.post(config.a, payload, {
                headers: config.ai.anthropicHeaders
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
            const response = await axios.post(config.ai.anthropicApiUrl
                , payload, {
                headers: config.ai.anthropicHeaders
            });
            const enhancedPrompt = response.data.content[0].text;
            results.push(enhancedPrompt);
        } catch (error) {
            results.push(`Error: ${error.message}`);
        }
    }

    return results;
};


const openai = new OpenAI({
    apiKey: config.ai.openaiApiKey
});

// DALL·E 3 image generation
export const generateImages = async (prompts, n = 1, size = "1024x1024") => {
    if (!config.ai.openaiApiKey || config.ai.openaiApiKey === 'your-api-key-here') {
        throw new Error("OpenAI API key not configured!");
    }

    const results = [];

    for (const prompt of prompts) {
        try {
            const response = await openai.images.generate({
                model: "gpt-image-1",
                prompt,

            });

            const imageUrls = response.data.map(img => img.url);
            results.push(...imageUrls);
        } catch (error) {
            console.error('Error generating image:', error);
            results.push(`Error generating image for "${prompt}": ${error.message}`);
        }
    }

    return results;
};

// DALL·E 2 image generation
export const generateImagesDALLE2 = async (prompts, n = 1, size = "1024x1024") => {
    if (!config.ai.openaiApiKey || config.ai.openaiApiKey === 'your-api-key-here') {
        throw new Error("OpenAI API key not configured!");
    }

    const results = [];

    for (const prompt of prompts) {
        try {
            const response = await openai.images.generate({
                model: "dall-e-2",
                prompt,
                n: Math.min(n, 10),
                size: size === "1024x1024" ? "1024x1024" : "512x512"
            });

            const imageUrls = response.data.map(img => img.url);
            results.push(...imageUrls);
        } catch (error) {
            console.error('OpenAI DALL-E 2 Error:', error);
            results.push(`Error generating image for "${prompt}": ${error.message}`);
        }
    }

    return results;
};


// test generateImages
export const testGenerateImages = async () => {
    try {
        const prompts = [
            "A futuristic city skyline at sunset",
            "A serene forest with a river running through it",
            "A majestic mountain range with snow-capped peaks"
        ];
        const images = await generateImages(prompts);
        console.log("Generated Images:", images);
    } catch (error) {
        console.error("Error in testGenerateImages:", error);
    }
};

// testGenerateImages().then(() => {
//     console.log("Image generation test completed.");
// }).catch(err => {
//     console.error("Error during image generation test:", err);
// });