import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#E27D60", "#85B09A", "#E8A365", "#1A2F24", "#6B8E23", "#5C6B62"];

const LABELS = {
  transport: "Transport",
  hotel: "Hotel",
  food: "Food",
  activities: "Activities",
  local_travel: "Local travel",
  buffer: "Buffer",
};

export default function BudgetChart({ breakdown }) {
  if (!breakdown || !breakdown.total) return null;
  const data = Object.entries(LABELS).map(([k, label]) => ({
    name: label,
    value: Number(breakdown[k] || 0),
  }));
  const currency = breakdown.currency || "USD";
  return (
    <div data-testid="budget-chart" className="tg-card">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="label-eyebrow">Estimated total</div>
          <div data-testid="budget-total-text" className="font-display font-bold text-3xl text-[#1A2F24] mt-1">
            {currency} {breakdown.total.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={3} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => `${currency} ${Number(v).toLocaleString()}`}
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e4e2", fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-[#5C6B62]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
              {d.name}
            </span>
            <span className="font-medium text-[#1A2F24]">
              {currency} {d.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
