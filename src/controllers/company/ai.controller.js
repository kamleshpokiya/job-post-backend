import { GoogleGenAI } from "@google/genai";

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// const systemInstruction = `You are an AI Job Description Assistant for a job-posting platform. Classify the user input into 3 cases and respond exactly as required.

// STRICT RULE: DO NOT UPDATE THE FORMAT OR STYLING. KEEP EXACTLY AS USER ENTERED. Preserve all line breaks, spacing, structure, and style exactly as the user wrote it. Only fix grammar and spelling errors.

// CASE 1 — Complete job description:
// • Input includes: position/role + experience + job type (onsite/remote/hybrid/full-time/part-time)
// • User message is in WhatsApp-style or custom style.
// Your Response:
// • Start directly with the enhanced text.
// • Preserve EXACT structure, format, spacing, punctuation, line breaks, and style.
// • Do NOT add or remove information.
// • Do NOT change order or formatting.
// • Fix ONLY grammar, spelling, clarity.
// • No greetings. No explanations.

// Example:
// User: "Hy, we need a react Developer witht a 5 years of experince..."
// Response: "Hi, we need a React Developer with 5 years of experience..."

// CASE 2 — Incomplete job description:
// • Check ONLY for these required fields:
//    1) position/role
//    2) experience
// • If any is missing, ask ONLY for the missing fields.
// • Format: "Please provide: [field1], [field2]"
// • Keep extremely short. No greetings.
// • If input is vague or not clearly a job post: "This doesn't seem to be a job description."

// Examples:
// Missing all → "Please provide: position, experience, job type"
// Missing experience → "Please provide: experience"

// CASE 3 — Invalid input:
// • Sexual, abusive, illegal, or unrelated to jobs.
// • Respond ONLY: "This doesn't seem to be a job description."

// General Rules:
// • No extra lines, no emojis, no added content.
// • Enhancement only — zero restructuring.
// • Output must feel like the user's style but error-free.
// • Output should be indistinguishable from user's style, just error-free
// `;

const systemInstruction = `You are an AI Job Description Assistant. Read the user input and decide:
1) Enhance job description (if valid)
2) Return error (if invalid)

GENERAL RULES:
• Preserve EXACT format, line breaks, spacing, and style of user input.
• Fix ONLY grammar and spelling.
• Do NOT add new info or remove info.
• No greetings, no emojis, no explanations.
• Final output must be under 1500 characters.

VALID JOB DESCRIPTION RULE:
• Must clearly describe a real job.
• Must contain meaningful job-related details (role, responsibility, skills, experience, location, job type, etc.).
• Repeated words or filler text (e.g., “we want laravel developer” repeated 20 times) is NOT a valid job.
• Sexual, illegal, abusive, or unrelated content is invalid.

IF VALID:
• Output ONLY the enhanced job description, same formatting preserved.

IF INVALID:
• Output ONLY:
{
  "success": false,
  "data": {
    "message": "This doesn't seem to be a proper job description."
  }
}
`;

export const enhanceJobDescription = async (req, res) => {
  try {
    const { description } = req.body;

    console.log("Description: ", description);

    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    // Gemini API

    // const response = await genai.models.generateContent({
    //   model: "gemini-2.5-flash",
    //   contents: [
    //     {
    //       role: "user",
    //       parts: [{ text: description }],
    //     },
    //   ],
    //   config: {
    //     systemInstruction: systemInstruction,
    //     thinkingConfig: {
    //       thinkingBudget: 50,
    //     },
    //   },
    // });

    // const enhancedDescription = response.text.trim();

    // console.log("Enhanced Description: ", enhancedDescription);
    
    // Groq API
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: description },
      ],
      max_completion_tokens: 600,
    });
    
    console.log("Response: ", response);
    console.log("Response >>>>>>>: ", response.choices[0].message.content);
    
    const enhancedDescription = response.choices[0].message.content;

    // Check if the AI returned an error response (JSON string)
    try {
      const parsedResponse = JSON.parse(enhancedDescription);
      if (parsedResponse.success === false) {
        // AI returned an error, pass it through as error response
        return res.status(400).json({
          success: false,
          data: parsedResponse.data,
        });
      }
    } catch (parseError) {
      // Not a JSON string, continue with success response
    }

    // AI returned a valid enhanced description
    return res.json({
      success: true,
      data: {
        message: enhancedDescription,
      },
    });
  } catch (error) {
    console.error("Error enhancing job description:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to enhance job description",
      error: error.message,
    });
  }
};
