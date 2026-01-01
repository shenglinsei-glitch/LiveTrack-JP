
import { GoogleGenAI, Type } from "@google/genai";
import { MonitoringStage, Artist } from "../types";
import { CONCERT_KEYWORDS, TICKET_KEYWORDS } from "../constants";

// Initialize the Google GenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function simulateMonitor(artist: Artist): Promise<{ 
  newStage?: MonitoringStage, 
  keyword?: string, 
  hasChange: boolean 
}> {
  // Use 'gemini-3-flash-preview' for basic text tasks.
  const model = 'gemini-3-flash-preview';
  
  // Rule mapping based on user requirements:
  // 1. Concert Tracking Stage (MONITORING_CONCERT): Monitor concert-related keywords (LIVE / TOUR / 公演 etc.)
  // 2. Ticket Tracking Stage (MONITORING_TICKETS): Monitor ticket-related keywords (会員限定 / 先行 / 一般販売 etc.)
  
  const isTicketStage = artist.stage === MonitoringStage.MONITORING_TICKETS;
  const keywordsToLookFor = isTicketStage ? TICKET_KEYWORDS : CONCERT_KEYWORDS;
  const stageDescription = isTicketStage 
    ? "Ticket Information Tracking Stage: Looking for lottery phases, fan club pre-sales, or general sales info."
    : "Concert Tracking Stage: Looking for new tour announcements, live performance dates, or event reveals.";

  const prompt = `
    Artist: ${artist.name}
    Current Tracking Stage: ${artist.stage}
    Stage Goal: ${stageDescription}
    Target URLs: ${artist.websiteUrls.filter(u => u.url.trim()).map(u => u.url).join(', ') || 'Official social media and news pages'}
    Specific Keywords to detect: ${keywordsToLookFor.join(', ')}

    Your Task:
    1. Analyze the content of the provided URLs (simulated analysis).
    2. Determine if there is NEW information matching the "Specific Keywords".
    3. If the current stage is MONITORING_CONCERT and you find a concert announcement, set hasChange to true and suggest newStage as CONCERT_DETECTED.
    4. If the current stage is MONITORING_TICKETS and you find specific ticket phase info (e.g., "Secondary Lottery" or "General Sale"), set hasChange to true and return the specific foundKeyword.
    
    IMPORTANT: Only return hasChange=true if the information is specific and matches the keywords for the CURRENT stage.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasChange: { 
              type: Type.BOOLEAN,
              description: "Whether a significant update matching the current stage's keywords was found."
            },
            foundKeyword: { 
              type: Type.STRING,
              description: "The specific keyword detected (e.g., 'ツアー', '二次先行')."
            },
            newStage: { 
              type: Type.STRING, 
              description: "The recommended next MonitoringStage if a transition is needed (e.g., 'CONCERT_DETECTED')." 
            },
            summary: {
              type: Type.STRING,
              description: "A brief summary of what was found."
            }
          },
          required: ['hasChange']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    let nextStage = artist.stage;
    if (result.hasChange) {
      if (artist.stage === MonitoringStage.MONITORING_CONCERT && result.newStage === 'CONCERT_DETECTED') {
        nextStage = MonitoringStage.CONCERT_DETECTED;
      }
    }

    return {
      newStage: nextStage,
      keyword: result.foundKeyword,
      hasChange: !!result.hasChange
    };
  } catch (error) {
    console.error("Tracking logic failed:", error);
    return { hasChange: false };
  }
}
