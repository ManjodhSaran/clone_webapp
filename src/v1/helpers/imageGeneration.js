import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGE_API_URL = "https://api.openai.com/v1/images/generations";

const HEADERS = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json"
};

/**
 * Generate images using OpenAI DALL·E 3 from a list of prompts.
 * Returns a list of image URLs or error messages.
 * 
 * @param {string[]} prompts - Array of text prompts for image generation
 * @param {string} size - Image size (default: "1024x1024")
 * @returns {Promise<string[]>} Array of image URLs or error messages
 */
async function generateImagesFromPrompts(prompts, size = "1024x1024") {
    if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured");
    }

    const results = [];

    for (const prompt of prompts) {
        const payload = {
            model: "dall-e-3",         // REQUIRED
            prompt: prompt,
            n: 1,
            size: size                 // Must be 1024x1024 for dall-e-3
        };

        try {
            const response = await axios.post(IMAGE_API_URL, payload, {
                headers: HEADERS
            });

            const imageUrl = response.data.data[0].url;
            results.push(imageUrl);

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

export {
    generateImagesFromPrompts
};