'use client'

import {
  Bar,
  BarChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { RevenueChartPoint } from '../page';

interface RevenueChartProps {
    data: RevenueChartPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-80 w-full bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Không có dữ liệu để hiển thị biểu đồ.</p>
            </div>
        );
    }
  
    const chartData = data.map(item => ({
        name: item.label,
        "Doanh Thu": item.revenue,
        "Doanh Số": item.salesCount,
    }));

  return (
    <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                    yAxisId="left"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${formatCurrency(Number(value))}`}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value, name, props) => {
                        if (name === "Doanh Thu") {
                            return [formatCurrency(Number(value)), "Doanh thu"];
                        }
                        if (name === "Doanh Số") {
                            return [value, "Doanh số (đơn hàng)"];
                        }
                        return [value, name];
                    }}
                />
                <Legend iconType="circle" />
                <Bar yAxisId="left" dataKey="Doanh Thu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="Doanh Số" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
}
