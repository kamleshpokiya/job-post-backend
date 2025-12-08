import { GoogleGenAI } from "@google/genai";
import Job from "../../models/job.model.js";

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const systemInstruction = `You are a Job Description Validator and Data Extractor. Read the user input, classify it into one of three cases, and respond EXACTLY as instructed. Output ONLY valid JSON.

REQUIRED FIELDS:
1) Position/Role
2) Experience
3) Job Type (full-time, part-time, contract, remote, hybrid, onsite)

CASE 1 — Complete job description
Condition:
• All three REQUIRED fields are present in the input.

Your Response (JSON only):
{
  "error": false,
  "data": {
    "jobTitle": "...",
    "experience": "...",
    "position": "...",
    "skills": ["...", "..."],
    "location": "...",
    "jobType": "..."
  }
}

Rules:
• Extract ONLY what the user explicitly wrote.
• Do NOT guess or infer missing information.
• Missing non-required fields → null or empty array.
• Extract job title, experience, skills, location, and job type exactly as stated.
• No extra text, no formatting, no explanations.
EXPERIENCE EXTRACTION RULES:
• If numeric experience is present:
  → Extract only the numeric value or range and append "years".
  Examples: "5 years", "2-4 years", "3+ years", "1 year"
• Remove unnecessary words like "of experience", "experience required", etc.
• If no numeric value exists:
  → Extract the experience level exactly as written.
  Examples: "Senior level", "Junior", "Mid-level", "Fresher", "Entry level"
• Do NOT guess missing experience.
• Do NOT convert levels to numeric.

CASE 2 — Incomplete job description
Condition:
• One or more REQUIRED fields are missing.

Your Response:
{
  "error": true,
  "message": "Please provide: [missing fields]"
}

Rules:
• Ask ONLY for missing fields.
• Maintain the order: position, experience, job type.
• If input is vague or unclear → message: "This doesn't seem to be a job description."
• No added sentences, no greetings.

Examples:
Missing all → "Please provide: position, experience, job type"
Missing experience → "Please provide: experience"
Missing experience & jobType → "Please provide: experience, job type"

CASE 3 — Invalid input
Condition:
• Sexual, abusive, illegal, unrelated to jobs, or clearly not job content.

Your Response:
{
  "error": true,
  "message": "This doesn't seem to be a job description."
}

General Rules
• Output MUST be valid JSON only.
• No text outside JSON.
• No emojis, no greetings, no explanations.
• Be strict: do not assume missing information.
• Skills extraction should be literal (only skills explicitly mentioned).
`;

export const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find(
      { companyId: "693287f2f02699bc9c77a996" },
      "_id companyId rawDescription status"
    );
    return res.json({ success: true, data: jobs });
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

    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: description }],
        },
      ],
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: {
          thinkingBudget: 50,
        },
      },
    });

    const responseText = response.text.trim();

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
