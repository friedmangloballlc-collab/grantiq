import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCard {
  label: string;
  value: number | string;
  description?: string;
}

interface AdminStatsProps {
  stats: StatCard[];
}

export function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">
              {stat.value}
            </p>
            {stat.description && (
              <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
