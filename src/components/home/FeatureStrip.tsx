import { BestPriceIcon, GenuineIcon, InstallmentIcon, ReplacementIcon, RocketIcon } from "@/components/icons";

const features = [
  { icon: GenuineIcon, lines: ["Explore models", "and variants"] },
  { icon: RocketIcon, lines: ["Follow orders", "in your account"] },
  { icon: InstallmentIcon, lines: ["Compare prices", "in BDT"] },
  { icon: ReplacementIcon, lines: ["Ask about", "product coverage"] },
  { icon: BestPriceIcon, lines: ["Find a fit", "for your budget"] },
];

/** Trust badges row above the footer SEO copy. */
export function FeatureStrip() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {features.map(({ icon: Icon, lines }) => (
        <div key={lines[0]} className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm last:col-span-2 sm:last:col-span-1">
          <div className="w-16 h-16 rounded-full bg-[#F3F0EA] flex items-center justify-center mb-4">
            <Icon />
          </div>
          <p className="text-neutral-800 text-base leading-snug">
            {lines[0]}
            <br />
            {lines[1]}
          </p>
        </div>
      ))}
    </div>
  );
}
