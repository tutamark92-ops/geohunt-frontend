
/**
 * Gemini AI Service — uses Google's Gemini model to generate dynamic,
 * personalized content for the treasure hunt experience.
 * Powers mission briefings, trivia facts, and proximity hints.
 */

import { GoogleGenAI } from "@google/genai";

/** Initialize the Gemini AI client using the API key from environment variables */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generate a personalized welcome message for a new player.
 * The AI creates a warm, 2-sentence greeting encouraging them to explore campus.
 * Falls back to a hardcoded message if the API call fails.
 * @param   {string} username - The player's display name
 * @returns {Promise<string>} The generated welcome message
 */
export async function generateMissionBriefing(username: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a friendly, enthusiastic university campus guide. Write a warm, 2-sentence welcome for a new explorer named "${username}". Encourage them to find 5 hidden landmark secrets around campus to learn about university life. Keep it fun and welcoming.`,
    });
    return response.text || `Welcome, Explorer ${username}! We've hidden 5 wonderful secrets across our campus. See if you can find them all to become a campus expert!`;
  } catch (error) {
    return `Welcome to the adventure, ${username}! Your map shows where our best campus stories are hidden. Let's go find them!`;
  }
}

/**
 * Generate a fun trivia fact about a specific campus landmark.
 * Used when a player taps on a treasure marker to learn something interesting.
 * @param   {string} landmarkName - The name of the treasure location
 * @param   {string} category     - The treasure's category (academic, social, sports, history)
 * @returns {Promise<string>}     A short, engaging trivia sentence
 */
export async function generateCampusTrivia(landmarkName: string, category: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a friendly campus historian. Provide a short, one-sentence fun fact about a landmark called "${landmarkName}" in the ${category} category. Make it sound like an interesting trivia fact for a prospective student.`,
    });
    return response.text || "Fun Fact: This landmark has been a favorite meeting spot for students for over fifty years!";
  } catch (error) {
    return "This place is a beloved part of our campus culture and has many stories to tell!";
  }
}

/**
 * Generate a helpful hint when a player is near a treasure but can't find the QR code.
 * Gives them a gentle nudge about where to look without giving it away entirely.
 * @param   {string} landmarkName - The name of the treasure they're looking for
 * @param   {string} originalClue - The treasure's original clue text
 * @returns {Promise<string>}     A 1-sentence proximity hint
 */
export async function generateProximityHint(landmarkName: string, originalClue: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `An explorer is looking for a hidden marker at "${landmarkName}". Their clue is "${originalClue}". Give them a polite, helpful 1-sentence tip on where the small QR sticker might be hidden (e.g., near eye level, on a post, etc.). Keep it helpful and friendly.`,
    });
    return response.text || "Hint: Try looking around eye-level near the main entrance signage—the marker is hiding in plain sight!";
  } catch (error) {
    return "Look closely at the informational plaques or nearby benches—the marker is very close!";
  }
}
