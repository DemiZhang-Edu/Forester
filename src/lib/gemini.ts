import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getImagePart(url: string) {
  try {
    if (url.startsWith('data:')) {
      const [meta, data] = url.split(',');
      const contentType = meta.split(':')[1].split(';')[0];
      return {
        inlineData: {
          mimeType: contentType,
          data: data,
        },
      };
    } else {
      const proxyResponse = await fetch('/api/proxy-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (proxyResponse.ok) {
        const { base64, contentType } = await proxyResponse.json();
        return {
          inlineData: {
            mimeType: contentType,
            data: base64,
          },
        };
      }
    }
  } catch (e) {
    console.warn("Image fetch failed:", e);
  }
  return null;
}

export async function describeMedia(url: string, type: 'photo' | 'video') {
  try {
    const imagePart = await getImagePart(url);
    const systemInstruction = "You are a helpful wildlife expert. Your goal is to write short, punchy, and simple descriptions for wildlife media. Keep it under 20 words. No technical jargon.";
    const userPrompt = type === 'photo' 
      ? "Look at this wildlife photo and write a very short, engaging, and simple description for it (1-2 sentences)." 
      : "Look at this wildlife video and write a short, simple, and exciting description for it (1-2 sentences).";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: imagePart 
        ? { parts: [imagePart, { text: userPrompt }] }
        : { parts: [{ text: `${systemInstruction}\n\n${userPrompt}\nMedia URL: ${url}` }] },
      config: {
        systemInstruction,
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("DescribeMedia Error:", error);
    throw error;
  }
}

export interface Detection {
  label: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
}

export async function aiMarkImage(url: string): Promise<Detection[]> {
  try {
    const imagePart = await getImagePart(url);
    if (!imagePart) throw new Error("Could not process image for AI marking.");

    const systemInstruction = "You are a wildlife computer vision expert. Detect animals, plants, or interesting natural features. Return findings in JSON format with 'label' and 'box_2d' (normalized [ymin, xmin, ymax, xmax] from 0-1000).";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [imagePart, { text: "Detect and mark nature features." }] },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              box_2d: { 
                type: Type.ARRAY, 
                items: { type: Type.NUMBER },
                description: "[ymin, xmin, ymax, xmax] normalized to 1000"
              }
            },
            required: ["label", "box_2d"]
          }
        }
      }
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Mark Error:", error);
    return [];
  }
}
