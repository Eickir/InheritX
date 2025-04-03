import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ff6961", "#ffa500"];

const STATUS_LABELS = {
  TestamentDeposited: "Déposé",
  TestamentApproved: "Approuvé",
  TestamentRejected: "Rejeté",
  TestamentOutdated: "Obsolète",
};

export default function ResponsivePieChart({ events, address }) {
  const countByStatus = () => {
    const statuses = Object.keys(STATUS_LABELS);
    const countMap = Object.fromEntries(statuses.map((status) => [status, 0]));

    events.forEach((event) => {
      if (event._depositor === address && countMap.hasOwnProperty(event.type)) {
        countMap[event.type]++;
      }
    });

    return Object.entries(countMap).map(([key, value]) => ({
      name: STATUS_LABELS[key] || key,
      value,
    }));
  };

  const data = countByStatus();

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            labelLine={false}
            isAnimationActive={true}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} testaments`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
