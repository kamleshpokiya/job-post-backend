import { GoogleGenAI } from "@google/genai";
import Job from "../../models/job.model.js";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// const systemInstruction = `You are a Job Description Validator and Data Extractor. Read the user input, classify it into one of three cases, and respond EXACTLY as instructed. Output ONLY valid JSON.

// REQUIRED FIELDS:
// 1) Position/Role
// 2) Experience
// // 3) Job Type (full-time, part-time, contract, remote, hybrid, onsite)

// CASE 1 — Complete job description
// Condition:
// • All three REQUIRED fields are present in the input.

// Your Response (JSON only):
// {
//   "error": false,
//   "data": {
//     "jobTitle": "...",
//     "experience": "...",
//     "position": "...",
//     "skills": ["...", "..."],
//     "location": "...",
//     "jobType": "..."
//   }
// }

// Rules:
// • Extract ONLY what the user explicitly wrote.
// • Do NOT guess or infer missing information.
// • Missing non-required fields → null or empty array.
// • Extract job title, experience, skills, location, and job type exactly as stated.
// • No extra text, no formatting, no explanations.
// EXPERIENCE EXTRACTION RULES:
// • If numeric experience is present:
//   → Extract only the numeric value or range and append "years".
//   Examples: "5 years", "2-4 years", "3+ years", "1 year"
// • Remove unnecessary words like "of experience", "experience required", etc.
// • If no numeric value exists:
//   → Extract the experience level exactly as written.
//   Examples: "Senior level", "Junior", "Mid-level", "Fresher", "Entry level"
// • Do NOT guess missing experience.
// • Do NOT convert levels to numeric.

// CASE 2 — Incomplete job description
// Condition:
// • One or more REQUIRED fields are missing.

// Your Response:
// {
//   "error": true,
//   "message": "Please provide: [missing fields]"
// }

// Rules:
// • Ask ONLY for missing fields.
// • Maintain the order: position, experience, job type.
// • If input is vague or unclear → message: "This doesn't seem to be a job description."
// • No added sentences, no greetings.

// Examples:
// Missing all → "Please provide: position, experience, job type"
// Missing experience → "Please provide: experience"
// Missing experience & jobType → "Please provide: experience, job type"

// CASE 3 — Invalid input
// Condition:
// • Sexual, abusive, illegal, unrelated to jobs, or clearly not job content.

// Your Response:
// {
//   "error": true,
//   "message": "This doesn't seem to be a job description."
// }

// General Rules
// • Output MUST be valid JSON only.
// • No text outside JSON.
// • No emojis, no greetings, no explanations.
// • Be strict: do not assume missing information.
// • Skills extraction should be literal (only skills explicitly mentioned).
// `;

const systemInstruction = `You are a Job Description Validator and Data Extractor.
Output VALID JSON ONLY.

Your task:
• Accept only clear, meaningful job descriptions.
• Reject anything containing irrelevant, sexual, abusive, random, or contradictory content.

A valid job description:
• Clearly describes a real job (role, tasks, skills, requirements, etc.)
• Contains mostly job-related information
• Does NOT include: random filler, insults, abusive language, emotional outbursts, or unrelated sentences.

If the input mixes job content with irrelevant or abusive text, treat it as INVALID.

Extraction rules:
• Extract only literal content written by the user.
• jobTitle → role/position mentioned.
• experience → numeric ("5 years", "2-4 years") or level ("Junior", "Senior") exactly as written.
• skills → only skills directly listed.
• location → only if written.
• jobType → only if written.
• Do NOT guess missing info.
• Missing optional fields → null or [].

CASE 1 — Valid job description
Return:
{
  "error": false,
  "data": {
    "jobTitle": "...",
    "experience": "...",
    "skills": [...],
    "location": "...",
    "jobType": "..."
  }
}

CASE 2 — Invalid or unclear description
Return:
{
  "error": true,
  "message": "This doesn't seem to be a proper job description."
}

Rules:
• JSON only.
• No explanations or extra text.
• Strictly reject any abusive, random, or mixed-content input.
`;

export const getJobs = async (req, res) => {
  try {
    // Get pagination parameters from query, with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const total = await Job.countDocuments({
      companyId: "693287f2f02699bc9c77a996",
    });

    // Get paginated jobs
    const jobs = await Job.find(
      { companyId: "693287f2f02699bc9c77a996" },
      "_id companyId rawDescription status"
    )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: jobs,

      currentPage: page,
      limit: limit,
      total: total,
      totalPages: totalPages,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to get jobs" });
  }
};

export const postJob = async (req, res) => {
  try {
    const { description } = req.body;
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
    // const responseText = response.text.trim();

    // Groq API
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: description },
      ],
      max_completion_tokens: 600,
    });
    const responseText = response.choices[0].message.content.trim();

    // Parse the JSON response from AI
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      let cleanedText = responseText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      // Find JSON object in the string (handles multiline JSON)
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in response");
      }

      let jsonStr = jsonMatch[0];

      // Properly escape control characters in JSON string values
      // This function recursively processes the JSON string to escape control chars
      const escapeControlChars = (str) => {
        let result = "";
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < str.length; i++) {
          const char = str[i];

          if (escapeNext) {
            result += char;
            escapeNext = false;
            continue;
          }

          if (char === "\\") {
            result += char;
            escapeNext = true;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            result += char;
            continue;
          }

          if (inString) {
            // Escape control characters inside strings
            if (char === "\n") result += "\\n";
            else if (char === "\r") result += "\\r";
            else if (char === "\t") result += "\\t";
            else if (char === "\f") result += "\\f";
            else if (char === "\b") result += "\\b";
            else result += char;
          } else {
            result += char;
          }
        }

        return result;
      };

      jsonStr = escapeControlChars(jsonStr);
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw response:", responseText);

      // If parsing fails, treat it as an invalid job description
      return res.json({
        success: false,
        message: "This doesn't seem to be a job description.",
      });
    }

    // Check if there's an error (invalid or incomplete job description)
    if (parsedResponse.error === true) {
      return res.json({
        success: false,
        message: parsedResponse.message,
      });
    }

    // If valid job description, save to database
    if (parsedResponse.error === false && parsedResponse.data) {
      const jobData = {
        companyId: "693287f2f02699bc9c77a996",
        rawDescription: description,
        extractedData: {
          jobTitle: parsedResponse.data.jobTitle || null,
          experience: parsedResponse.data.experience || null,
          position: parsedResponse.data.position || null,
          skills: parsedResponse.data.skills || null,
          location: parsedResponse.data.location || null,
          jobType: parsedResponse.data.jobType || null,
        },
      };

      const newJob = new Job(jobData);
      await newJob.save();

      return res.json({
        success: true,
        message: "job posted successfully",
        description: description,
      });
    }

    // Fallback for unexpected response format
    return res.status(500).json({
      success: false,
      message: "Unexpected response format from AI",
    });
  } catch (error) {
    console.error("Error posting job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to post job",
      error: error.message,
    });
  }
};
