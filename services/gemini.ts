import { GoogleGenAI, Type, Schema } from "@google/genai";
import { InclusivityAnalysis, FileContent, RewriteResult, ContentChange, CharacteristicDefinition, VisualStyle } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const checkApiKey = () => {
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }
};

export const analyzeInclusivity = async (input: FileContent): Promise<InclusivityAnalysis> => {
  checkApiKey();

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      fullText: { 
        type: Type.STRING, 
        description: "The full extracted plain text of the document. If the input is PDF, this must be the complete transcription." 
      },
      characteristics: {
        type: Type.ARRAY,
        items: { 
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The name of the characteristic (e.g., 'Person-first language')." },
            description: { type: Type.STRING, description: "A detailed educational explanation of what this characteristic is and why it matters for inclusivity." }
          },
          required: ["name", "description"]
        },
        description: "A list of 5-8 specific characteristics that make the text inclusive.",
      },
      highlights: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            snippet: { type: Type.STRING, description: "Verbatim quote from the text that best exemplifies a specific characteristic." },
            characteristic: { type: Type.STRING, description: "The specific characteristic name this snippet demonstrates (must match one in the characteristics list names exactly)." },
            explanation: { type: Type.STRING, description: "Brief explanation of why this snippet demonstrates the characteristic." }
          },
          required: ["snippet", "characteristic", "explanation"]
        }
      },
      systemInstruction: {
        type: Type.STRING,
        description: "A comprehensive, directive system prompt that instructs an AI to write in this exact inclusive style. It should cover vocabulary, tone, sentence structure, and pitfalls to avoid.",
      },
      tone: {
        type: Type.STRING,
        description: "A short 2-3 word description of the tone (e.g., 'Empathetic and clear').",
      },
      visualStyle: {
        type: Type.OBJECT,
        description: "CSS styles inferred from the document layout to mimic its look and feel.",
        properties: {
          fontFamily: { type: Type.STRING, description: "Suggested CSS font-family stack (e.g., 'Inter, sans-serif' or 'Times New Roman, serif')." },
          fontSize: { type: Type.STRING, description: "Suggested CSS font-size (e.g., '16px' or '1.1rem')." },
          lineHeight: { type: Type.STRING, description: "Suggested CSS line-height (e.g., '1.6')." },
          textColor: { type: Type.STRING, description: "Suggested CSS color hex code for text (e.g., '#1e293b')." },
          backgroundColor: { type: Type.STRING, description: "Suggested CSS background-color hex code (e.g., '#ffffff')." },
          textAlign: { type: Type.STRING, description: "Suggested CSS text-align (e.g., 'left', 'justify')." },
          spacing: { type: Type.STRING, description: "Suggested CSS padding for the container (e.g., '2rem')." }
        },
        required: ["fontFamily", "fontSize", "lineHeight", "textColor", "backgroundColor", "textAlign", "spacing"]
      }
    },
    required: ["fullText", "characteristics", "highlights", "systemInstruction", "tone", "visualStyle"],
  };

  const promptText = `
    Analyze the provided document/text to identify its "Inclusivity DNA" AND its "Visual Layout DNA". 
    1. Extract the full text (if it's a PDF/Image).
    2. Identify specific linguistic choices, structural patterns, and tonal qualities that make it inclusive.
    3. Analyze the VISUAL LAYOUT (fonts, spacing, density, color feel) and translate that into CSS properties in the 'visualStyle' field.
    4. Find specific snippets in the text that serve as evidence for these characteristics.
    5. Provide educational definitions for the identified characteristics.
  `;

  // Construct parts based on input type
  const parts: any[] = [];
  
  if (input.isBinary) {
    parts.push({ 
      inlineData: { 
        mimeType: input.mimeType, 
        data: input.data 
      } 
    });
    parts.push({ text: promptText });
  } else {
    parts.push({ 
      text: `${promptText}\n\nTEXT TO ANALYZE:\n"${input.data.substring(0, 30000)}"\n(Text truncated if too long, analyze available context).` 
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are an expert linguist and visual designer. Your job is to reverse-engineer the 'voice' and 'look' of a document.",
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    const result = JSON.parse(jsonText);
    
    // Add IDs to highlights
    if (result.highlights) {
      result.highlights = result.highlights.map((h: any, i: number) => ({
        ...h,
        id: `ref-highlight-${i}`
      }));
    }

    return result as InclusivityAnalysis;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw new Error("Failed to analyze the document. Please try again.");
  }
};

export const rewriteContent = async (
  target: FileContent, 
  instruction: string,
  characteristics: CharacteristicDefinition[],
  referenceStyle?: VisualStyle
): Promise<RewriteResult> => {
  checkApiKey();

  const rewriteSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      originalText: { type: Type.STRING, description: "The exact plain text content extracted from the original document." },
      rewrittenText: { type: Type.STRING, description: "The completely rewritten document. PRESERVE THE ORIGINAL STRUCTURE (headers, lists) using Markdown-like spacing." },
      summary: { type: Type.STRING, description: "A high-level summary (2-3 sentences) explaining the key shifts." },
      changes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            originalSnippet: { type: Type.STRING, description: "The exact short segment from the original text that was changed." },
            rewrittenSnippet: { type: Type.STRING, description: "The corresponding segment in the rewritten text." },
            concept: { type: Type.STRING, description: "The specific inclusivity concept that drove this change." },
            explanation: { type: Type.STRING, description: "A brief explanation of why this change improves inclusivity." }
          },
          required: ["originalSnippet", "rewrittenSnippet", "concept", "explanation"]
        }
      },
      finalLayoutStyle: {
        type: Type.OBJECT,
        description: "The final CSS styles to apply to the result container, merging the reference's 'vibe' with the target's 'structure'.",
        properties: {
          fontFamily: { type: Type.STRING },
          fontSize: { type: Type.STRING },
          lineHeight: { type: Type.STRING },
          textColor: { type: Type.STRING },
          backgroundColor: { type: Type.STRING },
          textAlign: { type: Type.STRING },
          spacing: { type: Type.STRING }
        },
        required: ["fontFamily", "fontSize", "lineHeight", "textColor", "backgroundColor", "textAlign", "spacing"]
      }
    },
    required: ["originalText", "rewrittenText", "summary", "changes", "finalLayoutStyle"]
  };

  const validConcepts = characteristics.map(c => `"${c.name}"`).join(", ");

  const promptConstraints = `
    Rewrite this document to be more inclusive based on the system instructions.
    
    LAYOUT INSTRUCTIONS:
    1. Scrape the layout structure (paragraphs, bullet points, headers) from the TARGET document and preserve it in the 'rewrittenText'.
    2. Scrape the visual style (fonts, density) from the REFERENCE styling provided below and output it in 'finalLayoutStyle'.
    
    REFERENCE STYLE TO EMULATE:
    ${JSON.stringify(referenceStyle || {})}

    IMPORTANT: 
    1. Return extracted original text and rewritten text.
    2. In 'changes', 'concept' MUST be one of: ${validConcepts}.
  `;

  const parts: any[] = [];

  if (target.isBinary) {
    parts.push({
      inlineData: {
        mimeType: target.mimeType,
        data: target.data
      }
    });
    parts.push({ text: promptConstraints });
  } else {
    parts.push({
      text: `${promptConstraints} \n\nORIGINAL TEXT:\n${target.data}`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: rewriteSchema,
        systemInstruction: instruction, 
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    const result = JSON.parse(jsonText);

    // Add client-side IDs to changes for React keys
    result.changes = result.changes.map((c: any, index: number) => ({
      ...c,
      id: `change-${index}`
    }));

    return result as RewriteResult;
  } catch (error) {
    console.error("Rewrite failed:", error);
    throw new Error("Failed to rewrite the document. Please try again.");
  }
};