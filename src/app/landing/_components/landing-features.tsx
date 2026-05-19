import { CalendarCheck, Mic, Send } from "lucide-react";

const features = [
  {
    icon: CalendarCheck,
    title: "Never miss a screen",
    description:
      "Today's interviews in one place + a reminder 10 minutes before the call. Always know exactly who you are speaking to next.",
  },
  {
    icon: Mic,
    title: "Stay present",
    description:
      "Taplo records and notes so you can focus entirely on the conversation, candidate body language, and asking the right questions.",
  },
  {
    icon: Send,
    title: "Send write-ups faster",
    description:
      "Summary, client draft, and follow-up email ready right after the call. Move candidates to the hiring manager instantly.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
      <div className="flex flex-col z-10 w-full relative gap-y-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium tracking-tight text-orange-600 mb-4">
            WHY RECRUITERS DOWNLOAD IT
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-slate-950 leading-[1.05]">
            Do the interview once.
            <span className="block text-slate-500">Not the paperwork twice.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group flex flex-col gap-4 rounded-[2rem] bg-white/70 border border-white p-8 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.24),inset_0_1px_0_white] hover:-translate-y-1 hover:bg-white/90 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-[inset_0_1px_0_white]">
                <feature.icon className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl font-normal tracking-tight text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-relaxed text-base font-light text-slate-600">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
