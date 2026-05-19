import {
  Bell,
  Calendar,
  Download,
  FileText,
  Mic,
} from "lucide-react";
import { FREE_TRIAL } from "../plans";
import { DownloadLink } from "./download-link";

export function LandingHero() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 md:pt-40 pb-16 md:pb-20">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-white px-4 py-2 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.3),inset_0_1px_0_white] mb-8">
            <span className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            </span>
            <span className="text-xs font-medium tracking-tight text-slate-600">
              The AI Desktop App for Recruiters
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] text-slate-950"
            style={{ textShadow: "0 1px 1px rgba(255,255,255,0.8)" }}
          >
            <span className="flex flex-col md:flex-row md:flex-wrap items-center md:items-baseline justify-center lg:justify-start gap-x-2 gap-y-1">
              <span>Stop rewriting interview notes</span>
              <span className="inline-flex mt-1 md:mt-0 md:ml-2 rounded-2xl bg-[#ff7a5c] border border-[#ff7a5c]/40 px-3 sm:px-4 py-1.5 text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-white font-normal text-center shadow-[0_8px_20px_-12px_rgba(255,122,92,0.35)]">
                after every call.
              </span>
            </span>
          </h1>

          <p className="mt-8 text-base md:text-lg leading-relaxed text-slate-600 font-light max-w-2xl mx-auto lg:mx-0">
            Taplo is a desktop app for recruiters. It syncs your interviews,
            reminds you before each meeting, records the conversation, and turns
            it into a client-ready write-up — using the job description and what
            the candidate actually said.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
            <DownloadLink
              platform="mac"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-900 text-white text-base font-normal shadow-[0_10px_24px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <Download className="w-5 h-5" strokeWidth={1.5} />
              Start free trial
            </DownloadLink>
            <DownloadLink
              platform="win"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-6 py-4 border border-slate-300 bg-white/90 text-slate-800 text-sm font-medium hover:border-orange-200 hover:text-orange-600 transition-all duration-300"
            >
              Download for Windows
            </DownloadLink>
          </div>

          <p className="mt-4 text-sm font-medium text-[#ff7a5c] text-center lg:text-left leading-snug max-w-md mx-auto lg:mx-0">
            <span className="block sm:inline">{FREE_TRIAL.label}</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">{FREE_TRIAL.detail}</span>
          </p>

          <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 font-light">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-[18px] h-[18px] text-orange-500" strokeWidth={1.5} />
              Works with Google Calendar &amp; Outlook
            </span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-2">
              <Mic className="w-[18px] h-[18px] text-orange-500" strokeWidth={1.5} />
              You control when recording starts
            </span>
          </div>
        </div>

        <div className="relative lg:pl-6 mt-12 lg:mt-0">
          <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-[#ff7a5c]/35 via-white/30 to-[#ff7a5c]/20 blur-3xl" />
          <div className="relative rounded-[2rem] bg-[#f8fafc] border border-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35),inset_0_2px_0_rgba(255,255,255,1)] p-4 sm:p-5">
            <div className="hidden md:block absolute inset-0 z-20 pointer-events-none">
              <div className="taplo-float-bubble absolute -right-8 top-12 rounded-2xl bg-white/95 backdrop-blur border border-white px-4 py-3 shadow-[0_18px_38px_-20px_rgba(15,23,42,0.45),inset_0_1px_0_white] min-w-[14rem]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                    <Bell className="w-[18px] h-[18px] text-orange-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 font-medium">Interview in 10 mins</p>
                    <p className="text-xs text-slate-500 font-light">Senior Frontend Developer</p>
                  </div>
                </div>
              </div>

              <div className="taplo-float-bubble absolute -right-6 top-[45%] rounded-2xl bg-white/95 backdrop-blur border border-white px-4 py-3 shadow-[0_18px_38px_-20px_rgba(15,23,42,0.45),inset_0_1px_0_white] min-w-[14rem]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 font-medium">Recording Started</p>
                    <p className="text-xs text-slate-500 font-light">Taking notes in background</p>
                  </div>
                </div>
              </div>

              <div className="taplo-float-bubble absolute -left-8 -bottom-4 rounded-2xl bg-white/95 backdrop-blur border border-white px-4 py-3 shadow-[0_18px_38px_-20px_rgba(15,23,42,0.45),inset_0_1px_0_white] min-w-[14rem]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <FileText className="w-[18px] h-[18px] text-emerald-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 font-medium">Write-up Generated</p>
                    <p className="text-xs text-slate-500 font-light">Ready to send to client</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white border border-slate-200 shadow-[inset_0_1px_0_white] overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-200" />
                  <span className="w-3 h-3 rounded-full bg-slate-200" />
                  <span className="w-3 h-3 rounded-full bg-slate-200" />
                </div>
                <div className="text-xs font-medium text-slate-400 tracking-tight uppercase">
                  Taplo Desktop
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-sm text-orange-500 font-medium mb-1">Queue for Today</p>
                    <h2 className="text-xl sm:text-2xl font-normal tracking-tight text-slate-900">
                      3 Interviews Scheduled
                    </h2>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="taplo-hero-card rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                          SJ
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-medium text-slate-800">Sarah Jenkins</p>
                          <p className="text-sm text-slate-500 font-light">10:00 AM • Product Manager</p>
                        </div>
                      </div>
                      <span className="self-start sm:self-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        Done
                      </span>
                    </div>
                  </div>

                  <div className="taplo-hero-card rounded-2xl bg-white border border-orange-200 p-4 shadow-[0_4px_12px_rgba(255,122,92,0.08)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">
                          MR
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-medium text-slate-800">Michael Ross</p>
                          <p className="text-sm text-slate-500 font-light">11:30 AM • Senior Engineer</p>
                        </div>
                      </div>
                      <span className="self-start sm:self-auto text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        In 10m
                      </span>
                    </div>
                  </div>

                  <div className="taplo-hero-card mt-2 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 p-5 shadow-[inset_0_1px_0_white]">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.5} />
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">
                        Recent Output
                      </p>
                    </div>
                    <p className="text-lg font-normal text-slate-900 tracking-tight">
                      Client Submission: S. Jenkins
                    </p>
                    <p className="text-sm text-slate-500 font-light mt-1">
                      Generated matching specific job requirements. Ready to copy into email.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

