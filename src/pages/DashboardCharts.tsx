import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { date, money } from "../lib/format";
import type { DashboardDay } from "../types";

const compact = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
const tooltipStyle = { backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: 8, color: "var(--text)" };

export function DailyBars({ points }: { points: DashboardDay[] }) {
  return (
    <ResponsiveContainer width="100%" height={252}>
      <BarChart data={points} barGap={3} margin={{ top: 12, left: 0, right: 8, bottom: 0 }} aria-label="GMV và doanh thu theo ngày">
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
        <XAxis dataKey="day" tickFormatter={(value: string) => date(value).slice(0, 5)} minTickGap={18} axisLine={false} tickLine={false} tickMargin={10} tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis tickFormatter={(value: number) => compact.format(value)} width={48} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip
          labelFormatter={(value) => date(String(value))}
          formatter={(value) => money(typeof value === "number" ? value : null)}
          contentStyle={tooltipStyle}
          itemStyle={{ color: "var(--text)" }}
          cursor={{ fill: "var(--surface-subtle)" }}
        />
        <Bar dataKey="gmv" name="GMV" fill="var(--dashboard-blue-light)" maxBarSize={30} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="revenue" name="Doanh thu" fill="var(--dashboard-blue)" maxBarSize={30} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentDonut({ payments }: { payments: { name: string; value: number; fill: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart accessibilityLayer={false}>
        <Pie data={payments} dataKey="value" nameKey="name" innerRadius={51} outerRadius={71} stroke="none" isAnimationActive={false} />
      </PieChart>
    </ResponsiveContainer>
  );
}
