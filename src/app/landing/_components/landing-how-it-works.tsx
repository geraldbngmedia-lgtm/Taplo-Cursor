import { CalendarPlus, ClipboardList, PlayCircle } from "lucide-react";

const steps = [
  {
    number: "1",
    icon: CalendarPlus,
    title: "Connect calendar",
    description:
      "Taplo securely syncs with Google Calendar or Outlook to build your daily interview queue automatically.",
  },
  {
    number: "2",
    icon: ClipboardList,
    title: "Paste JD",
    description:
      "Drop the job description into the candidate's card so the AI knows exactly what skills and experience to look for.",
  },
  {
    number: "3",
    icon: PlayCircle,
    title: "Record & review",
    description:
      "Hit record when the call starts. When you hang up, your fully formatted write-up is waiting for you.",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <p className="text-sm font-medium tracking-tight text-orange-600 mb-4">
          HOW IT WORKS
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-slate-950 leading-[1.05]">
          Three steps to better workflows.
        </h2>
      </div>

      <div className="relative overflow-hidden rounded-[2.75rem] bg-white/60 backdrop-blur-xl border border-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,1)] px-6 md:px-10 pt-16 pb-16">
        <div className="hidden lg:block absolute left-10 right-10 top-[3.5rem] h-px">
          <div className="absolute inset-0 border-t border-dashed border-orange-200" />
          <div className="absolute top-[-1px] left-0 h-[2px] w-48 bg-gradient-to-r from-transparent via-orange-500 to-transparent rounded-full taplo-connection-flow" />
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative flex flex-col items-center text-center"
            >
              <div className="h-24 w-full relative flex items-center justify-center mb-2">
                <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border border-slate-200 shadow-[0_16px_34px_-20px_rgba(15,23,42,0.2)]">
                  <span className="text-lg font-medium text-slate-900">{step.number}</span>
                </span>
              </div>
              <div className="w-14 h-14 mx-auto rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-5 text-orange-600 shadow-[inset_0_1px_0_white]">
                <step.icon className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-normal tracking-tight text-slate-950">
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-500 font-light px-4">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
