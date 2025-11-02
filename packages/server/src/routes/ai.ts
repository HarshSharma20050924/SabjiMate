import { Router, Request, Response } from 'express';
import multer from 'multer';
import { GoogleGenAI, Type, GenerateContentResponse, Content } from '@google/genai';
import { reverseGeocode } from '../services/geocoding';
import logger from '../logger';
import { ChatMessage } from '../../../common/types';

const router = Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// --- Audio order processing ---
router.post('/process-audio-order', upload.single('audio'), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No audio file provided.' });
    if (!process.env.API_KEY) {
        logger.error("Gemini API key is not configured on the server.");
        return res.status(500).json({ error: 'Server is not configured for AI processing.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const audioBytes = file.buffer.toString('base64');
        const audioPart = { inlineData: { mimeType: file.mimetype, data: audioBytes } };
        const textPart = { text: `Transcribe this audio of a user ordering vegetables. Then, extract vegetable names and quantities. Quantities must be '100g', '250g', '500g', or '1kg'. Normalize 'half a kilo' to '500g', 'a quarter kilo' to '250g', 'pao' to '250g'. Default quantity: '1kg'. Return as JSON array.` };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [audioPart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            vegetable: { type: Type.STRING, description: 'Vegetable name.' },
                            quantity: { type: Type.STRING, description: "Quantity ('100g','250g','500g','1kg')." }
                        },
                        required: ["vegetable", "quantity"]
                    }
                }
            }
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) throw new Error("Received empty AI response.");
        const parsedItems = JSON.parse(jsonStr);
        res.json(parsedItems);

    } catch (error) {
        logger.error(error, 'Error processing audio with Gemini');
        res.status(500).json({ error: 'Failed to process the audio order.' });
    }
});

// --- Recipe of the day ---
router.post('/recipe-of-the-day', async (req: Request, res: Response) => {
    const { vegetableNames } = req.body;
    if (!Array.isArray(vegetableNames) || vegetableNames.length === 0) {
        return res.status(400).json({ error: 'An array of vegetable names is required.' });
    }
    if (!process.env.API_KEY) {
        logger.error("Gemini API key is not configured.");
        return res.status(500).json({ error: 'Server not configured for AI.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const randomVeggie = vegetableNames[Math.floor(Math.random() * vegetableNames.length)];
        const prompt = `Create a simple Indian recipe featuring "${randomVeggie}". Return as JSON object.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recipeName: { type: Type.STRING },
                        description: { type: Type.STRING },
                        ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                        instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["recipeName","description","ingredients","instructions"]
                }
            }
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) throw new Error("Received empty AI response for recipe.");
        const recipe = JSON.parse(jsonStr);
        res.json(recipe);

    } catch (error) {
        logger.error(error, 'Error generating recipe from Gemini');
        res.status(500).json({ error: 'Failed to generate recipe.' });
    }
});

// --- Reverse geocoding ---
router.post('/reverse-geocode', async (req: Request, res: Response) => {
    const { lat, lon } = req.body;
    if (lat === undefined || lon === undefined) {
        return res.status(400).json({ error: 'Latitude and longitude required.' });
    }

    try {
        const addressDetails = await reverseGeocode(lat, lon);
        if (!addressDetails) throw new Error('Reverse geocoding failed.');
        res.json(addressDetails);
    } catch (error) {
        logger.error(error, 'Error in reverse geocode route');
        res.status(500).json({ error: 'Internal geocoding error.' });
    }
});

// --- Chat ---
router.post('/chat', async (req: Request, res: Response) => {
    const { history, message, systemInstruction } = req.body as { history: ChatMessage[], message: string, systemInstruction: string };
    if (!message) return res.status(400).json({ error: 'A message is required.' });
    if (!process.env.API_KEY) {
        logger.error("Gemini API key is not configured.");
        return res.status(500).json({ error: 'Server not configured for AI.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const contents: Content[] = [
            ...history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
            { role: 'user', parts: [{ text: message }] }
        ];

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: { systemInstruction }
        });

        const textResponse = response.text?.trim() ?? '';
        res.json({ response: textResponse });

    } catch (error) {
        logger.error(error, 'Error getting chat response from Gemini');
        res.status(500).json({ error: 'Failed to get AI response.' });
    }
});

export default router;
