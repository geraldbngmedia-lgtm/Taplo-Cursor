import type { CalendarProvider, Meeting } from "@/lib/workspace/types";

export type RecallCalendarClient = {
  connect(provider: CalendarProvider): Promise<void>;
  sync(): Promise<Meeting[]>;
};

export function getRecallCalendarAuthUrl(provider: CalendarProvider) {
  return `https://api.recall.ai/oauth/${provider}/authorize`;
}

export function createMockCalendarMeetings(): Meeting[] {
  const now = Date.now();

  return [
    {
      id: "calendar-mock-google-primary",
      source: "calendar",
      candidateName: "Alex Morgan",
      roleTitle: "Product Engineer",
      jobDescription: "Full-stack role with React, Node.js, product discovery, and client-facing delivery.",
      candidateCv: "Calendar invite placeholder. Add CV before recording for richer analysis.",
      recruiterNotes: "Synced from calendar. Confirm salary expectations and notice period.",
      scheduledAt: new Date(now + 9 * 60 * 1000).toISOString(),
      calendarEventId: "mock-google-primary",
      calendarProvider: "google",
      joinUrl: "https://meet.google.com/taplo-demo",
      status: "upcoming",
    },
    {
      id: "calendar-mock-outlook-primary",
      source: "calendar",
      candidateName: "Priya Shah",
      roleTitle: "Data Platform Lead",
      jobDescription: "Leadership role covering data platform reliability, governance, and stakeholder management.",
      candidateCv: "Calendar invite placeholder. Attach CV after sync.",
      recruiterNotes: "Ask about team size, cloud data stack, and migration experience.",
      scheduledAt: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      calendarEventId: "mock-outlook-primary",
      calendarProvider: "outlook",
      joinUrl: "https://teams.microsoft.com/l/meetup-join/taplo-demo",
      status: "upcoming",
    },
  ];
}
