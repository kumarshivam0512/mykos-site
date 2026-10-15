import RainText from "@/components/ui/matrix-code";

export function RainTextDemo() {
  return <div className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden bg-black">
    <RainText fontSize={20} color="#00ff00" characters="01" fadeOpacity={0.1} speed={1} />
    <h1 className="relative bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-6xl font-bold text-transparent motion-safe:animate-pulse">
      Matrix Code
    </h1>
  </div>;
}
