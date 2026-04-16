
import { GoogleGenAI, Type } from "@google/genai";
import { AuditResult, Guideline } from "../types/audit";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateGuidelineRules(
  description: string,
  images: string[]
): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are an expert Visual Merchandising Specialist. 
    Your task is to create a set of clear, actionable, and precise "Audit Rules" based on a user's description and reference images.
    
    The rules should be formatted as a clear list. 
    Focus on:
    - Exact placement of items.
    - Specific distances or alignments.
    - Sequence of posters or signs.
    - Any specific details visible in the reference images.
    
    Be as specific as possible (e.g., "Place the A5 sign 115mm from the Apple Watch SE 3").
    If the user provides a rough description, use the images to refine and add precision to the rules.
    Return ONLY the rules as a plain text list.
  `;

  const parts: any[] = [
    { text: `User Description: ${description}` },
  ];

  images.forEach((img, idx) => {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: img.split(',')[1] || img,
      },
    });
    parts.push({ text: `Reference Image ${idx + 1}` });
  });

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction,
    },
  });

  return response.text || "";
}

export async function analyzeStoreLayout(
  fileData: string,
  mimeType: string,
  allGuidelines: Guideline[]
): Promise<AuditResult> {
  const model = "gemini-3-flash-preview";
  
  const guidelinesContext = allGuidelines.length > 0 
    ? allGuidelines.map(g => `Guideline Name: ${g.name}\nDescription: ${g.description}\nRules: ${g.rules}`).join('\n---\n')
    : "No specific guidelines provided. Perform a general audit based on retail best practices (cleanliness, organization, safety, and professional presentation).";

  const systemInstruction = `
    You are an expert Visual Merchandising Auditor. 
    Your task is to analyze a "Store Photo" or "Store Video".
    
    ${allGuidelines.length > 0 ? `
    I am providing a list of specific Guidelines and their corresponding "Golden Sample" reference images. 
    First, identify which guideline(s) are most relevant to the provided store media. 
    Then, compare the store media against the identified guideline's text rules and reference images.
    Point out any discrepancies in placement, distance, or items.
    ` : `
    Perform a general audit based on retail best practices.
    `}
    
    Analyze the following:
    1. Placement: Are items placed in the correct positions?
    2. Distance: Is the spacing between items correct?
    3. Poster Order: Are promotional posters in the correct sequence?
    4. Prohibited Items: Are there any items that shouldn't be there (e.g., personal belongings, trash, incorrect products)?
    5. Video Specific: If a video is provided, look at the entire scene as it unfolds.
    
    Return a JSON object matching the AuditResult interface.
    The status for each check must be 'pass', 'fail', or 'warning'.
    Provide specific suggestions for 'fail' or 'warning' statuses.
    IMPORTANT: All text fields (summary, title, message, suggestion) MUST be in Thai language.
  `;

  const parts: any[] = [
    { text: `Available Guidelines:\n${guidelinesContext}` },
    {
      inlineData: {
        mimeType: mimeType,
        data: fileData.split(',')[1] || fileData,
      },
    },
  ];

  // Add reference images from all guidelines if they exist (limit to a few to avoid token bloat)
  let refImageCount = 0;
  allGuidelines.forEach(g => {
    g.images.forEach(img => {
      if (refImageCount < 5) { // Limit to 5 reference images total
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: img.split(',')[1] || img,
          },
        });
        parts.push({ text: `Reference image for guideline: ${g.name}` });
        refImageCount++;
      }
    });
  });

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          checks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                category: { 
                  type: Type.STRING,
                  enum: ['placement', 'distance', 'poster', 'prohibited', 'general']
                },
                title: { type: Type.STRING },
                status: { 
                  type: Type.STRING,
                  enum: ['pass', 'fail', 'warning']
                },
                message: { type: Type.STRING },
                suggestion: { type: Type.STRING },
              },
              required: ['id', 'category', 'title', 'status', 'message']
            }
          }
        },
        required: ['overallScore', 'summary', 'checks']
      }
    },
  });

  const result = JSON.parse(response.text || "{}");
  return {
    ...result,
    timestamp: new Date().toISOString(),
  };
}

export async function generateAutoGuideline(
  images: string[]
): Promise<{ name: string; description: string; rules: string }> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are an expert Visual Merchandising Specialist. 
    Your task is to analyze the provided "Golden Sample" reference images and automatically generate a comprehensive Guideline.
    
    You must return a JSON object with:
    1. name: A concise, professional name for this display in Thai.
    2. description: A brief summary of what this display is and its purpose in Thai.
    3. rules: A detailed, numbered list of audit rules in Thai. Be extremely precise about placement, spacing, and alignment based on what you see in the images.
    
    Format the rules clearly so they can be used for automated auditing.
    IMPORTANT: All content MUST be in Thai language.
  `;

  const parts: any[] = [];

  images.forEach((img, idx) => {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: img.split(',')[1] || img,
      },
    });
    parts.push({ text: `Reference Image ${idx + 1}` });
  });

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          rules: { type: Type.STRING },
        },
        required: ['name', 'description', 'rules']
      }
    },
  });

  return JSON.parse(response.text || "{}");
}
