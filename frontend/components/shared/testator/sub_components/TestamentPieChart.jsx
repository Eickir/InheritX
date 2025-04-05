import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STATUS_LABELS = {
  TestamentDeposited: "En attente",
  TestamentApproved: "Approuvé",
  TestamentRejected: "Rejeté",
  TestamentOutdated: "Obsolète",
};

const STATUS_COLORS = {
  TestamentDeposited: "#ECC94B",   // Jaune
  TestamentApproved: "#38A169",    // Vert
  TestamentRejected: "#E53E3E",    // Rouge
  TestamentOutdated: "#A0AEC0",    // Gris
};

export default function ResponsivePieChart({ events, address }) {
  const computeLatestStatuses = () => {
    const latestStatusByCID = {};

    events
      .filter((event) => event._depositor === address)
      .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)) // du plus récent au plus ancien
      .forEach((event) => {
        if (!latestStatusByCID[event.cid]) {
          latestStatusByCID[event.cid] = event.type;
        }
      });

    const countMap = Object.values(latestStatusByCID).reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(countMap).map(([type, value]) => ({
      name: STATUS_LABELS[type] || type,
      value,
      color: STATUS_COLORS[type] || "#000000", // fallback noir
    }));
  };

  const data = computeLatestStatuses();

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
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} testaments`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
