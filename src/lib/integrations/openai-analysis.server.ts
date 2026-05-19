import OpenAI from "openai";
import { z } from "zod";
import type { AnalysisOutput, LiveGuidance } from "@/lib/workspace/types";
import type { AnalyzeSessionContext, OpenAiAnalysisClient } from "./openai-analysis";

const guidanceSchema = z.object({
  coveredTopics: z.array(z.string()),
  gaps: z.array(z.string()),
  suggestedFollowUps: z.array(z.string()),
});

const analysisSchema = z.object({
  candidateSummary: z.string(),
  experienceSignals: z.array(z.object({ label: z.string(), evidence: z.string() })),
  technicalSignals: z.array(z.object({ label: z.string(), evidence: z.string() })),
  communicationObservations: z.array(z.string()),
  concernsAndMissingInfo: z.array(z.string()),
  clientSubmissionDraft: z.string(),
  followUpEmailDraft: z.string(),
  internalRecruiterNotes: z.string(),
});

export function createOpenAiAnalysisClient(apiKey = process.env.OPENAI_API_KEY): OpenAiAnalysisClient {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for real OpenAI analysis.");
  }

  const client = new OpenAI({ apiKey });

  return {
    async liveGuidance(context) {
      const result = await client.responses.create({
        model: "gpt-4.1-mini",
        input: buildGuidancePrompt(context),
        text: {
          format: {
            type: "json_schema",
            name: "taplo_live_guidance",
            schema: z.toJSONSchema(guidanceSchema),
            strict: true,
          },
        },
      });
      const parsed = guidanceSchema.parse(JSON.parse(result.output_text));

      return {
        id: crypto.randomUUID(),
        sessionId: context.sessionId,
        createdAt: new Date().toISOString(),
        ...parsed,
      } satisfies LiveGuidance;
    },
    async analyze(context) {
      const result = await client.responses.create({
        model: "gpt-4.1-mini",
        input: buildAnalysisPrompt(context),
        text: {
          format: {
            type: "json_schema",
            name: "taplo_final_analysis",
            schema: z.toJSONSchema(analysisSchema),
            strict: true,
          },
        },
      });
      const parsed = analysisSchema.parse(JSON.parse(result.output_text));

      return {
        id: crypto.randomUUID(),
        sessionId: context.sessionId,
        createdAt: new Date().toISOString(),
        ...parsed,
      } satisfies AnalysisOutput;
    },
  };
}

function buildGuidancePrompt(context: AnalyzeSessionContext) {
  return [
    "You are assisting a recruiter during a live candidate interview.",
    "Return concise JSON with covered topics, gaps, and suggested follow-up questions.",
    `Meeting: ${context.meeting?.candidateName ?? "Unknown candidate"} for ${context.meeting?.roleTitle ?? "unknown role"}.`,
    `Job description: ${context.meeting?.jobDescription ?? ""}`,
    `Transcript:\n${formatTranscript(context)}`,
  ].join("\n\n");
}

function buildAnalysisPrompt(context: AnalyzeSessionContext) {
  return [
    "Generate structured recruiter interview notes from this transcript.",
    "Use evidence from the transcript where possible. Flag missing information instead of inventing details.",
    `Candidate: ${context.meeting?.candidateName ?? "Unknown candidate"}`,
    `Role: ${context.meeting?.roleTitle ?? "Unknown role"}`,
    `Job description: ${context.meeting?.jobDescription ?? ""}`,
    `Candidate CV: ${context.meeting?.candidateCv ?? ""}`,
    `Recruiter notes: ${context.meeting?.recruiterNotes ?? ""}`,
    `Transcript:\n${formatTranscript(context)}`,
  ].join("\n\n");
}

function formatTranscript(context: AnalyzeSessionContext) {
  return context.transcriptSegments.map((segment) => `${segment.speaker}: ${segment.text}`).join("\n");
}
