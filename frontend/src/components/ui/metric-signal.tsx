export function DarkMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/10 p-3 backdrop-blur sm:p-4">
      <Icon className="mb-3 text-accent" size={20} />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-fog/50">{label}</p>
      <p className="mt-2 text-xl font-black sm:text-2xl">{value}</p>
    </div>
  );
}

export function Signal({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/8 p-4 backdrop-blur">
      <Icon className="mb-3 text-accent" size={22} />
      <p className="text-sm text-fog/60">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}
