import { GoogleGenAI } from "@google/genai";
import { SchemaMetadata } from "@/types/schema";
import { MappingProposal } from "@/types/mapping";
import {
  buildProposalPrompt,
  mappingProposalResponseSchema,
} from "@/lib/ai/prompt";
import {
  validateMappingProposal,
  validateSchemaMetadata,
} from "@/lib/ai/validator";

export interface ProposalServiceOptions {
  apiKey?: string;
  model?: string;
  generateContent?: (
    prompt: string,
    source: SchemaMetadata,
    target: SchemaMetadata
  ) => Promise<string>;
}

export async function generateMappingProposal(
  rawSource: SchemaMetadata,
  rawTarget: SchemaMetadata,
  options?: ProposalServiceOptions
): Promise<MappingProposal> {
  const source = validateSchemaMetadata(rawSource, "source");
  const target = validateSchemaMetadata(rawTarget, "target");

  const prompt = buildProposalPrompt(source, target);

  let rawJsonText: string;

  if (options?.generateContent) {
    rawJsonText = await options.generateContent(prompt, source, target);
  } else {
    const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      throw new Error("GEMINI_API_KEY is not configured on the server");
    }

    const modelName =
      options?.model || process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.0,
          responseMimeType: "application/json",
          responseSchema: mappingProposalResponseSchema,
        },
      });

      if (!response.text) {
        throw new Error("Empty response received from Gemini model");
      }

      rawJsonText = response.text;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("GEMINI_API_KEY")) {
          throw err;
        }
        throw new Error(`Gemini proposal generation failed: ${err.message}`);
      }
      throw new Error("Gemini proposal generation failed with unknown error");
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    throw new Error("Malformed JSON received from model response");
  }

  return validateMappingProposal(parsed, source, target);
}
