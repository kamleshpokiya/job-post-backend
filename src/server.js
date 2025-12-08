import express from "express";
const app = express();
const PORT = 8080;
import { GoogleGenAI } from "@google/genai";
import { db } from "./db.js";
import aiRoutes from "./routes/ai.routes.js";
import jobRoutes from "./routes/job.routes.js";
import cors from "cors";

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Middleware
app.use(express.json());
app.use(cors());

// Basic route
app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Connect to database
db();

// Routes

app.use("/api", aiRoutes);
app.use("/api", jobRoutes);

// app.post("/enhance-job-description", async (req, res) => {
//   try {
//     const { prompt } = req.body;

//     if (!prompt) {
//       return res.status(400).json({ error: "Prompt is required" });
//     }

//     //     const systemInstruction = `Your role:

//     // You act as a Job Description Validator, Enhancer, and Assistant.

//     // You must classify the user input into one of three cases and respond accordingly.

//     // 🟢 CASE 1 — User provides a complete & valid job description

//     // Examples of valid content:

//     // WhatsApp-style job posts

//     // Detailed descriptions with role, location, experience, etc.

//     // Structured lists (Responsibilities, Requirements)

//     // Your Action:

//     // ✔ Keep the same pattern/format

//     // ✔ Enhance grammar, clarity, and readability

//     // ✔ Add small improvements without changing the structure

//     // ✔ Do NOT rewrite or convert into formal JD

//     // ✔ Do NOT ask for more details (already complete)

//     // 🟡 CASE 2 — User provides incomplete or unclear job description

//     // Examples:

//     // "We want Laravel developer"

//     // "Need React dev asap"

//     // "Hiring designer"

//     // "Looking for backend guy"

//     // Or anything missing important information

//     // Your Action:

//     // ❌ Do NOT auto-generate a full job description

//     // ❌ Do NOT assume skills, experience, location, etc.

//     // Instead:

//     // 👉 Ask the user for the missing required parameters so you can enhance or finalize their job description.

//     // Typical required parameters (customizable later):

//     // Job Role / Position

//     // Experience Range

//     // Key Skills

//     // Job Type (Full-time, Part-time, Remote, Hybrid)

//     // Location

//     // Education (if required)

//     // Responsibilities (optional but recommended)

//     // Contact Email / Phone

//     // Example Response:

//     // "Thanks! To complete this job description, I need a few more details:

//     // • Required experience range?

//     // • Key skills?

//     // • Job location?

//     // • Any responsibilities you want to mention?

//     // • Contact details for applying?

//     // Please provide these, and I will enhance your job description."

//     // 🔴 CASE 3 — Input is inappropriate or NOT a job description

//     // Examples:

//     // Sexual or abusive text

//     // Irrelevant personal messages

//     // Non-job related content

//     // Harmful or illegal content

//     // Your Action:

//     // ✔ Do NOT generate any job content

//     // ✔ Politely inform the user that the input is invalid

//     // ✔ Ask them to provide a real job description

//     // Example Response:

//     // "⚠️ The message you entered doesn't appear to be a job description.

//     // Please share a valid job requirement so I can help you."

//     // 🧩 Important Rules (Global Behavior)

//     // Maintain a friendly, professional tone

//     // Do NOT create fake job details

//     // Do NOT guess details

//     // Do NOT format in corporate JD unless the user already uses that style

//     // Follow WhatsApp-style formatting if user uses it

//     // Keep emojis consistent with user's pattern if they use them`;

//     const systemInstruction = `You are an AI Job Description Assistant. Classify user input into one of three cases and respond accordingly:

// CASE 1 — Complete & valid job description:
// • User provides a detailed JD or WhatsApp-style job post with role, location, experience, contact, etc.
// Your Response:
// • Keep user's style and format
// • Improve clarity, grammar, and flow
// • Enhance lightly without changing structure
// • Do NOT ask for more details
// • Do NOT convert to corporate JD format

// CASE 2 — Incomplete job description:
// • Input is short or missing key details (e.g., "Need Laravel developer").
// Your Response:
// • Do NOT generate a full JD
// • Do NOT assume missing details
// • Ask for required parameters only:
//   - Position/Role
//   - Experience
//   - Key Skills
//   - Job Type
//   - Location
//   - Responsibilities (optional)

// CASE 3 — Invalid or inappropriate input:
// • Sexual, abusive, illegal, irrelevant, or not related to jobs.
// Your Response:
// • Politely decline and request a valid job description.

// General Rules:
// • Maintain friendly, professional tone
// • Keep emojis/style consistent with user input
// • No guessing or inventing job details
// `;

//     const response = await genai.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [
//         {
//           role: "user",
//           parts: [{ text: prompt }],
//         },
//       ],
//       config: {
//         systemInstruction: systemInstruction,

//         thinkingConfig: {
//           thinkingBudget: 50,
//         },
//       },
//     });
//     console.log("Response: ", response);
//     console.log("Response: ", response.usageMetadata.promptTokensDetails);

//     res.json({ response: response.text });
//   } catch (error) {
//     console.error("Error generating content:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// app.post("/post-job", async (req, res) => {
//   try {
//     const { prompt } = req.body;
//     if (!prompt) {
//       return res.status(400).json({ error: "Prompt is required" });
//     }

//     //     const systemInstruction = `Your role:

//     // You act as a Job Description Validator and Data Extractor.

//     // You must follow these steps in order:

//     // STEP 1 — Check if input is inappropriate or NOT a job description (CASE 3)

//     // Examples of inappropriate content:
//     // - Sexual or abusive text
//     // - Irrelevant personal messages
//     // - Non-job related content
//     // - Harmful or illegal content

//     // If CASE 3 is true, respond ONLY with this JSON format:
//     // {
//     //   "error": true,
//     //   "message": "⚠️ The message you entered doesn't appear to be a job description. Please share a valid job requirement so I can help you."
//     // }

//     // STEP 2 — Check if input is incomplete or unclear (CASE 2)

//     // Examples of incomplete content:
//     // - "We want Laravel developer"
//     // - "Need React dev asap"
//     // - "Hiring designer"
//     // - "Looking for backend guy"
//     // - Anything missing important information like job title, experience, skills, etc.

//     // If CASE 2 is true, respond ONLY with this JSON format:
//     // {
//     //   "error": true,

//     //   "message": "Thanks! To complete this job description, I need a few more details:\n\n• Required experience range?\n• Key skills?\n• Job type (Full-time, Part-time, Remote, Hybrid)?\n• \n\nPlease provide these details."
//     // }

//     // STEP 3 — Extract structured data (if both checks pass)

//     // If the input is valid AND complete, extract the following fields from the job description and respond ONLY with this JSON format:

//     // {
//     //   "error": false,

//     //   "data": {
//     //     "jobTitle": "extracted job title or position name",
//     //     "experience": "extracted experience range (e.g., '2-5 years', 'Senior level', etc.)",
//     //     "position": "extracted position level (e.g., 'Senior', 'Junior', 'Mid-level', etc.)",
//     //     "skills": ["skill1", "skill2", "skill3"],
//     //     "location": "extracted location (city, state, country, or 'Remote')",
//     //     "jobType": "extracted job type (Full-time, Part-time, Contract, Remote, Hybrid)",
//     //     "description": "full job description text",
//     //     "responsibilities": ["responsibility1", "responsibility2"],
//     //     "requirements": ["requirement1", "requirement2"],
//     //     "education": "extracted education requirements (if mentioned)",
//     //     "contactEmail": "extracted contact email (if mentioned)",
//     //     "contactPhone": "extracted contact phone (if mentioned)"
//     //   }
//     // }

//     // Important Rules:
//     // - ALWAYS respond in valid JSON format only
//     // - Do NOT include any text outside the JSON structure
//     // - If a field is not found in the description, use null or empty string/array
//     // - Extract only information that is explicitly mentioned in the job description
//     // - Do NOT create fake or assumed data
//     // - Maintain professional tone in error messages`;

//     const systemInstruction = `You are a Job Description Validator and Data Extractor. Follow these steps:

// STEP 1 — Inappropriate / Not a job description (CASE 3)
// Identify inputs that are sexual, abusive, illegal, irrelevant, or not job-related.
// If true, reply ONLY:
// {
//   "error": true,
//   "message": "⚠️ The message you entered doesn't appear to be a job description. Please share a valid job requirement so I can help you."
// }

// STEP 2 — Incomplete job description (CASE 2)
// Input is short, vague, or missing essentials (e.g., role, experience, skills).
// Examples: “Need Laravel developer”, “Hiring designer”.
// If true, reply ONLY:
// {
//   "error": true,
//   "message": "Thanks! To post this job , I need a few details:\n\n• Experience range?\n• Key skills?\n• Job type (Full-time/Part-time/Remote/Hybrid)?\n\nPlease provide these details."
// }

// STEP 3 — Valid and complete job description (CASE 1)
// Extract structured data. Reply ONLY:
// {
//   "error": false,
//   "data": {
//     "jobTitle": "...",
//     "experience": "...",
//     "position": "...",
//     "skills": [...],
//     "location": "...",
//     "jobType": "...",
//   }
// }

// Rules:
// • Always output valid JSON only
// • No text outside JSON
// • Missing fields → null or empty values
// • Extract only what is explicitly mentioned
// • No guessing or inventing data
// `;

//     const response = await genai.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [
//         {
//           role: "user",
//           parts: [{ text: prompt }],
//         },
//       ],
//       config: {
//         systemInstruction: systemInstruction,
//         thinkingConfig: {
//           thinkingBudget: 50,
//         },
//       },
//     });

//     console.log("Response: ", response);
//     console.log("Response: ", response.usageMetadata?.promptTokensDetails);

//     // Parse the JSON response from AI
//     const responseText = response.text.trim();
//     let parsedResponse;

//     try {
//       // Try to extract JSON from the response (in case AI wraps it in markdown)
//       const jsonMatch = responseText.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         parsedResponse = JSON.parse(jsonMatch[0]);
//       } else {
//         parsedResponse = JSON.parse(responseText);
//       }
//     } catch (parseError) {
//       console.error("Error parsing JSON response:", parseError);
//       return res.status(500).json({
//         error: "Failed to parse AI response",
//         rawResponse: responseText,
//       });
//     }

//     res.json(parsedResponse);
//   } catch (error) {
//     console.error("Error generating content:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
