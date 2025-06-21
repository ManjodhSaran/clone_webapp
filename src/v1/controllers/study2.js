import axios from 'axios';

import { enhancePromptsForImageGeneration } from '../helpers/imageGeneration.js';

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createErrorPage } from '../../helper/createErrorPage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache the template to avoid reading it every time
let htmlTemplate = null;

const loadTemplate = async () => {
    if (!htmlTemplate) {
        const templatePath = path.join(__dirname, '../template/educational-template.html');
        htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    }
    return htmlTemplate;
};

const generateImageElements = (imageUrls) => {
    return imageUrls.map((url, index) => {
        if (url && !url.startsWith('Error')) {
            return `
                <div class="image-container">
                    <img src="${url}" alt="Educational illustration ${index + 1}" loading="lazy">
                </div>
            `;
        } else {
            return `
                <div class="image-container">
                    <div class="image-placeholder">
                        Image ${index + 1} - Loading...
                    </div>
                </div>
            `;
        }
    }).join('');
};

const generateListItems = (items) => {
    return items.map(item => `<li>${item}</li>`).join('');
};


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

export const generateHtmlContentFromWord = async (req, res) => {
    try {
        const { word } = req.params;
        const model = req.query.model || "claude-3-haiku-20240307";

        // Validate API key
        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({
                error: "Anthropic API key not configured"
            });
        }

        // Validate model
        if (!ALLOWED_MODELS.includes(model)) {
            return res.status(400).json({
                error: `Unsupported model '${model}'. Allowed: ${ALLOWED_MODELS.join(', ')}`
            });
        }

        // Optimized prompt - only asks for content, not HTML structure
        const prompt = `
You are an expert educational content creator.
Create educational content for the concept: **${word}**.

Audience: Middle to high school students. Use friendly, simple language but keep it scientifically accurate.
Avoid overly technical jargon. Use analogies and storytelling where helpful.

Respond ONLY in JSON format with this exact structure:
{
  "definition": "A clear, concise 1-2 sentence definition",
  "explanation": "A detailed paragraph explanation (3-5 sentences) that elaborates on the concept with examples and context",
  "examples": ["Real-world example 1", "Real-world example 2", "Real-world example 3"],
  "misconceptions": ["Common misconception 1", "Common misconception 2"],
  "imagePrompts": ["Educational illustration prompt 1", "Diagram/visual prompt 2", "Real-world example image prompt 3"]
}

Focus on educational value and clarity. Make it engaging for students.
`;

        const requestBody = {
            model: model,
            max_tokens: 1500,
            temperature: 0.7,
            messages: [
                { role: "user", content: prompt }
            ]
        };

        // Make request to Anthropic API
        const response = await axios.post(ANTHROPIC_API_URL, requestBody, {
            headers: HEADERS
        });

        const content = response.data.content[0].text;
        const parsedContent = JSON.parse(content);

        // Validate the response structure
        const required = ['definition', 'explanation', 'examples', 'misconceptions'];
        const missing = required.filter(field => !(field in parsedContent));

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Generate images in parallel with content processing
        let imageUrls = [];
        try {
            const imagePrompts = parsedContent.imagePrompts || [
                `Educational illustration of ${word}`,
                `Scientific diagram showing ${word}`,
                `Real-world application of ${word}`
            ];
            imageUrls = await enhancePromptsForImageGeneration(imagePrompts);
        } catch (imageError) {
            console.warn('Image generation failed:', imageError);
            imageUrls = ['', '', '']; // Fallback to placeholders
        }

        // Load and populate template
        const template = await loadTemplate();

        const htmlContent = template
            .replace(/\{\{TITLE\}\}/g, word.charAt(0).toUpperCase() + word.slice(1))
            .replace(/\{\{DEFINITION\}\}/g, parsedContent.definition)
            .replace(/\{\{EXPLANATION\}\}/g, parsedContent.explanation)
            .replace(/\{\{EXAMPLES\}\}/g, generateListItems(parsedContent.examples))
            .replace(/\{\{MISCONCEPTIONS\}\}/g, generateListItems(parsedContent.misconceptions))
            .replace(/\{\{IMAGES\}\}/g, generateImageElements(imageUrls));

        // Return HTML response
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.status(200).send(htmlContent);

    } catch (error) {
        console.error('Error generating HTML content:', error);

        // Load error template or create simple error HTML
        const errorHtml = await createErrorPage(error, req.params.word);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(error.response?.status || 500).send(errorHtml);
    }
};

