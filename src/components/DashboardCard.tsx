interface DashboardCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  accent?: string;
}

export function DashboardCard({ title, value, subtitle, accent = "text-sf-primary" }: DashboardCardProps) {
  return (
    <div className="bg-sf-surface border border-sf-border rounded-xl p-5">
      <p className="text-sf-muted text-sm mb-1">{title}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      {subtitle && <p className="text-sf-muted text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
