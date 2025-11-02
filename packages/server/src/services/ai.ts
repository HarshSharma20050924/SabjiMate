
import { GoogleGenAI, Type } from '@google/genai';
import logger from '../logger';

interface AddressDetails {
    address: string;
    city: string;
    state: string;
}

export const reverseGeocodeWithAI = async (lat: number, lon: number): Promise<AddressDetails | null> => {
    if (!process.env.API_KEY) {
        logger.error("Gemini API key is not configured on the server.");
        throw new Error('Server is not configured for AI processing.');
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const prompt = `Given the coordinates latitude=${lat} and longitude=${lon}, provide the detailed address, city, and state in India. Format the response as a valid JSON object.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        address: {
                            type: Type.STRING,
                            description: "The full street address, including house number, street, and locality.",
                        },
                        city: {
                            type: Type.STRING,
                            description: "The city name.",
                        },
                        state: {
                            type: Type.STRING,
                            description: "The state name.",
                        },
                    },
                    required: ["address", "city", "state"],
                },
            },
        });
        
        const jsonStr = response.text?.trim() ?? '';
        if (!jsonStr) {
            throw new Error("Received an empty response from the AI for geocoding.");
        }
        const parsedAddress = JSON.parse(jsonStr);

        return parsedAddress;

    } catch (error) {
        logger.error(error, 'Error during reverse geocoding with Gemini');
        return null;
    }
};