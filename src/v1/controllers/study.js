import axios from 'axios';
import OpenAI from 'openai';
import { config } from '../config/index.js';

const validateGenerateResponse = (data) => {
    const required = ['definition', 'explanation', 'realWorldApplications', 'misconceptions'];
    const missing = required.filter(field => !(field in data));

    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    return data;
};

const cleanJsonResponse = (content) => {
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.substring(firstBrace, lastBrace + 1);
    }

    content = content
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\u0000-\u0019]+/g, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();

    return content;
};

const parseJsonSafely = (content) => {
    try {
        return JSON.parse(content);
    } catch (error) {
        let fixedContent = content;

        fixedContent = fixedContent
            .replace(/,(\s*[\]}])/g, '$1')
            .replace(/"\s*\n\s*"/g, '",\n"')
            .replace(/}(\s*)"([^"]+)":/g, '},\n"$2":')
            .replace(/](\s*)"([^"]+)":/g, '],\n"$2":')
            .replace(/"([^"]*)"([^",:}\]]*)"([^",:}\]]*)"(\s*[,:}\]])/g, '"$1\\"$2\\"$3"$4');

        try {
            return JSON.parse(fixedContent);
        } catch (secondError) {
            const fallbackResponse = {
                definition: "Content generation failed due to formatting issues",
                explanation: "The AI generated malformed JSON. Please try again.",
                realWorldApplications: "Please try again",
                misconceptions: "Please try again"
            };

            return fallbackResponse;
        }
    }
};

const searchGoogleImages = async (query, count = 8) => {
    try {
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: config.google.apiKey,
                cx: config.google.searchEngineId,
                q: query,
                searchType: 'image',
                num: count,
                safe: 'active',
                imgSize: 'large',
                imgType: 'photo',
                fileType: 'jpg,png',
                imgColorType: 'color',
                fields: 'items(title,link,image,displayLink)'
            },
            timeout: 10000
        });

        if (!response.data.items || response.data.items.length === 0) {
            return [];
        }

        const filteredImages = response.data.items
            .filter(item => {
                if (!item.link || !item.image) {
                    return false;
                }

                const width = item.image?.width || 0;
                const height = item.image?.height || 0;

                return width >= 200 && height >= 150;
            })
            .map(item => ({
                url: item.link,
                title: item.title || 'Educational Image',
                thumbnail: item.image?.thumbnailLink || item.link,
                context: item.image?.contextLink || `https://${item.displayLink}`,
                width: item.image?.width || 0,
                height: item.image?.height || 0,
                size: item.image?.byteSize || 0,
                source: item.displayLink || 'Unknown'
            }))
            .sort((a, b) => {
                const aSize = (a.width * a.height) || 0;
                const bSize = (b.width * b.height) || 0;
                return bSize - aSize;
            });

        return filteredImages;

    } catch (error) {
        return [];
    }
};

export const generateContentFromWord = async (req, res) => {
    try {
        const { word } = req.params;

        if (!config.ai.openaiApiKey) {
            return res.status(500).json({
                error: "OpenAI API key not configured"
            });
        }

        if (!config.google.apiKey || !config.google.searchEngineId) {
            return res.status(500).json({
                error: "Google API key or Search Engine ID not configured"
            });
        }

        const openai = new OpenAI({
            apiKey: config.ai.openaiApiKey,
        });

        const prompt = `Create educational content for the given topic.

CRITICAL: Return ONLY valid JSON. No explanatory text, markdown, or code blocks.

JSON format :
{
  "definition": "Brief definition (max 300 chars)",
  "explanation": "Short explanation with examples (max 300 chars)",
  "realWorldApplications": "Real world analogies related to the topic",
  "misconceptions": "Any misconceptions, fun facts, memory tips if related to the topic"
}

Topic: ${word}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an educational content generator. Return only valid JSON with no additional text or formatting."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 800,
            temperature: 0.3
        });

        let content = response.choices[0].message.content;
        content = cleanJsonResponse(content);

        let parsedContent;
        try {
            parsedContent = parseJsonSafely(content);
        } catch (jsonError) {
            return res.status(500).json({
                error: "Failed to parse AI response as valid JSON",
                details: jsonError.message,
                rawResponse: content.substring(0, 500) + '...'
            });
        }

        try {
            validateGenerateResponse(parsedContent);
        } catch (validationError) {
            return res.status(500).json({
                error: "AI response validation failed",
                details: validationError.message,
                parsedContent: parsedContent
            });
        }

        const uniqueImages = await searchGoogleImages(word, 8);

        const result = {
            ...parsedContent,
            images: uniqueImages
        };

        res.status(200).json(result);

    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.error?.message || error.response.statusText;
            res.status(status).json({ error: `API Error: ${message}` });
        } else {
            res.status(500).json({ error: `Error generating content: ${error.message}` });
        }
    }
};