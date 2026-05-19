import type { AnalysisOutput, LiveGuidance, Meeting, TranscriptSegment } from "@/lib/workspace/types";

export type AnalyzeSessionContext = {
  sessionId: string;
  meeting?: Meeting;
  transcriptSegments: TranscriptSegment[];
};

export type OpenAiAnalysisClient = {
  liveGuidance(context: AnalyzeSessionContext): Promise<LiveGuidance>;
  analyze(context: AnalyzeSessionContext): Promise<AnalysisOutput>;
};

export function createMockOpenAiAnalysisClient(): OpenAiAnalysisClient {
  return {
    async liveGuidance({ sessionId, transcriptSegments }) {
      const transcriptText = transcriptSegments.map((segment) => segment.text).join(" ");

      return {
        id: crypto.randomUUID(),
        sessionId,
        createdAt: new Date().toISOString(),
        coveredTopics: transcriptText ? ["Recent project ownership", "Delivery approach", "Stakeholder collaboration"] : ["Interview setup"],
        gaps: ["Compensation expectations", "Notice period", "Specific technical depth"],
        suggestedFollowUps: [
          "Ask for a concrete example of debugging a production issue.",
          "Confirm candidate motivation for this role.",
          "Probe team leadership and mentoring scope.",
        ],
      };
    },
    async analyze({ sessionId, meeting, transcriptSegments }) {
      const transcriptText = transcriptSegments.map((segment) => `${segment.speaker}: ${segment.text}`).join("\n");
      const candidate = meeting?.candidateName ?? "the candidate";
      const role = meeting?.roleTitle ?? "the role";

      return {
        id: crypto.randomUUID(),
        sessionId,
        createdAt: new Date().toISOString(),
        candidateSummary: `${candidate} appears aligned to ${role}, with examples that show delivery ownership, cross-functional communication, and a pragmatic rollout style.`,
        experienceSignals: [
          {
            label: "Delivery ownership",
            evidence: transcriptText || "Candidate described leading a migration and coordinating multiple functions.",
          },
          {
            label: "Stakeholder management",
            evidence: "Mentioned coordinating product, design, and QA during rollout.",
          },
        ],
        technicalSignals: [
          {
            label: "TypeScript and React depth",
            evidence: "Referenced a TypeScript migration in a recruiter-facing product.",
          },
          {
            label: "Release management",
            evidence: "Used feature flags and incremental workflow migration to reduce risk.",
          },
        ],
        communicationObservations: [
          "Answers were structured around business context, action, and outcome.",
          "Explained trade-offs in recruiter-friendly language.",
        ],
        concernsAndMissingInfo: [
          "Compensation expectations were not captured.",
          "Availability and notice period need confirmation.",
          "More detail is needed on hands-on technical contribution versus coordination.",
        ],
        clientSubmissionDraft: `${candidate} is a strong potential match for ${role}. They gave relevant examples of leading TypeScript migration work, managing rollout risk with feature flags, and coordinating with product, design, and QA. Recommended next step: technical deep dive focused on architecture decisions and production debugging.`,
        followUpEmailDraft: `Hi ${candidate},\n\nThanks for speaking today. I enjoyed learning more about your recent platform migration work and how you approached rollout risk. I will share the next steps shortly. In the meantime, could you confirm your notice period and compensation expectations?\n\nBest,\nTaplo Recruiting`,
        internalRecruiterNotes:
          "Good client submission candidate if technical depth checks out. Follow up on salary, notice period, and specific hands-on coding scope before shortlisting.",
      };
    },
  };
}
