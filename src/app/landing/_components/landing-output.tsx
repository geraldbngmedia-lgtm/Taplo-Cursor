import { FileText, ListChecks, Mail, User } from "lucide-react";
import { DownloadLink } from "./download-link";

const outputs = [
  {
    icon: User,
    title: "Candidate summary",
    description: "High-level overview of the applicant",
  },
  {
    icon: ListChecks,
    title: "Experience & technical notes",
    description: "Matched directly against the JD",
  },
  {
    icon: FileText,
    title: "Client submission draft",
    description: "Polished write-up ready to send",
  },
  {
    icon: Mail,
    title: "Follow-up email & private notes",
    description: "Candidate comms and internal gap tracking",
  },
];

export function LandingOutput() {
  return (
    <section id="output" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      <div className="overflow-hidden rounded-[2.75rem] bg-gradient-to-b from-slate-900 to-slate-950 text-white border border-white/10 relative shadow-[0_40px_90px_-45px_rgba(15,23,42,0.78),inset_0_1px_0_rgba(255,255,255,0.14)]">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-[-30%] right-[-10%] w-[32rem] h-[32rem] rounded-full bg-orange-500/20 blur-[6rem]" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_1fr] min-h-0 md:min-h-[500px] h-full items-center">
          <div className="p-6 sm:p-8 md:p-12 lg:p-16">
            <p className="text-sm font-medium tracking-tight text-orange-400 mb-4 uppercase">
              INSTANT OUTPUT
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight mb-6 leading-tight">
              What you get after each interview.
            </h2>
            <p className="text-lg leading-relaxed text-slate-300 font-light max-w-xl">
              Taplo takes the transcript, compares it to the job description you
              provided, and instantly generates all the documents you need to
              proceed.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <DownloadLink
                platform="mac"
                className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-white text-slate-900 text-base font-medium shadow-[inset_0_1px_0_white] hover:bg-slate-100 hover:-translate-y-0.5 transition-all"
              >
                Download for Mac
              </DownloadLink>
            </div>
          </div>

          <div className="relative p-6 md:p-10 lg:pr-16 w-full">
            <div className="rounded-[2rem] bg-white/10 border border-white/10 p-2 backdrop-blur-md shadow-2xl">
              <div className="rounded-[1.75rem] bg-slate-900 border border-white/5 overflow-hidden p-6 space-y-4">
                {outputs.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
                      <item.icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="text-base text-white font-medium">{item.title}</h4>
                      <p className="text-sm text-slate-400 font-light mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


