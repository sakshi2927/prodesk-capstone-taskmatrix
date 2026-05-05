"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsPoint = {
  day: string;
  total: number;
};

type DashboardAnalyticsChartProps = {
  data: AnalyticsPoint[];
};

export default function DashboardAnalyticsChart({ data }: DashboardAnalyticsChartProps) {
  return (
    <div aria-label="Bar chart showing completed tasks by day" role="img" className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,120,98,0.25)" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="total" fill="#c14f2a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}