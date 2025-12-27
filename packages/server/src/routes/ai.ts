import { Router, Request, Response } from 'express';
import multer from 'multer';
import { GoogleGenAI, Type, GenerateContentResponse, Content } from '@google/genai';
import logger from '../logger';
import { ChatMessage } from '../../../common/types';
import { reverseGeocode } from '../services/geocoding';

const router = Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit for audio file
});

router.post('/process-audio-order', upload.single('audio'), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: 'No audio file provided.' });
    }
    if (!process.env.API_KEY) {
        logger.error("Gemini API key is not configured on the server.");
        return res.status(500).json({ error: 'Server is not configured for AI processing.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const audioBytes = file.buffer.toString('base64');
        const audioPart = {
            inlineData: {
                mimeType: file.mimetype,
                data: audioBytes,
            },
        };

        const textPart = {
            text: `Transcribe this audio of a user ordering vegetables. Then, from the transcription, extract the vegetable names and their quantities. The quantity must be one of '100g', '250g', '500g', or '1kg'. Normalize weights like 'half a kilo' to '500g', 'a quarter kilo' to '250g', and 'pao' to '250g'. If no quantity is mentioned for a vegetable, default it to '1kg'. Provide the response as a valid JSON array of objects.`,
        };
        
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
                            vegetable: {
                                type: Type.STRING,
                                description: 'The name of the vegetable in English or Hindi.',
                            },
                            quantity: {
                                type: Type.STRING,
                                description: "The quantity. Must be one of: '100g', '250g', '500g', '1kg'.",
                            },
                        },
                        required: ["vegetable", "quantity"],
                    },
                },
            },
        });
        
        const jsonStr = response.text?.trim() ?? '';
        if (!jsonStr) {
            throw new Error("Received an empty response from the AI.");
        }
        const parsedItems = JSON.parse(jsonStr);

        res.json(parsedItems);

    } catch (error) {
        logger.error(error, 'Error processing audio with Gemini');
        res.status(500).json({ error: 'Failed to process the audio order.' });
    }
});

router.post('/recipe-of-the-day', async (req: Request, res: Response) => {
    const { vegetableNames } = req.body;
    if (!vegetableNames || !Array.isArray(vegetableNames) || vegetableNames.length === 0) {
        return res.status(400).json({ error: 'An array of vegetable names is required.' });
    }
    if (!process.env.API_KEY) {
        logger.error("Gemini API key is not configured on the server.");
        return res.status(500).json({ error: 'Server is not configured for AI processing.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const randomVeggie = vegetableNames[Math.floor(Math.random() * vegetableNames.length)];
        const prompt = `Create a simple, delicious, and traditional Indian recipe that features "${randomVeggie}". The recipe should be easy to follow for a home cook. Provide the response as a valid JSON object.`;

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
                        ingredients: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        instructions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["recipeName", "description", "ingredients", "instructions"],
                },
            },
        });
        
        const jsonStr = response.text?.trim() ?? '';
        if (!jsonStr) {
            throw new Error("Received an empty response from the AI for recipe generation.");
        }
        const recipe = JSON.parse(jsonStr);
        res.json(recipe);

    } catch (error) {
        logger.error(error, 'Error getting recipe from Gemini');
        res.status(500).json({ error: 'Failed to generate a recipe.' });
    }
});

router.post('/reverse-geocode', async (req: Request, res: Response) => {
    const { lat, lon } = req.body;
    if (lat === undefined || lon === undefined) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    try {
        // Switch to using Nominatim (OpenStreetMap) via our internal service
        // This is free and does not require the Gemini API Key or Maps Tool
        const addressDetails = await reverseGeocode(parseFloat(lat), parseFloat(lon));

        if (!addressDetails) {
            throw new Error('Could not determine address from location service.');
        }
        
        res.json(addressDetails);

    } catch (error) {
        logger.error(error, "Error in reverse geocode route");
        res.status(500).json({ error: 'An internal error occurred during geocoding.' });
    }
});

router.post('/chat', async (req: Request, res: Response) => {
    const { history, message, systemInstruction } = req.body as { history: ChatMessage[], message: string, systemInstruction: string };

    if (!message) {
        return res.status(400).json({ error: 'A message is required.' });
    }
     if (!process.env.API_KEY) {
        logger.error("Gemini API key is not configured on the server.");
        return res.status(500).json({ error: 'Server is not configured for AI processing.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Combine history and the new message to send in a single generateContent call
        const contents: Content[] = [
            ...history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            })),
            {
                role: 'user', // The new message is always from the user
                parts: [{ text: message }]
            }
        ];
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents, // Pass the full conversation history
            config: {
                systemInstruction: systemInstruction,
            },
        });
        
        const textResponse = response.text?.trim() ?? '';
        res.json({ response: textResponse });

    } catch (error) {
        logger.error(error, 'Error getting chat response from Gemini');
        res.status(500).json({ error: 'Failed to get a response from the AI assistant.' });
    }
});


export default router;