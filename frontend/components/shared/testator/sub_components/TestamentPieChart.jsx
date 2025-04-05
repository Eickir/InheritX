import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STATUS_LABELS = {
  Pending: "En attente",
  Approved: "Approuvé",
  Rejected: "Rejeté",
  Outdated: "Obsolète",
};

const STATUS_COLORS = {
  Pending: "#ECC94B",
  Approved: "#38A169",
  Rejected: "#E53E3E",
  Outdated: "#A0AEC0",
};

const statusMapping = {
  TestamentDeposited: "Pending",
  TestamentApproved: "Approved",
  TestamentRejected: "Rejected",
  TestamentOutdated: "Outdated",
};

const statusPriority = {
  TestamentApproved: 3,
  TestamentRejected: 2,
  TestamentOutdated: 1,
  TestamentDeposited: 0,
};

function computeLogicalStatuses(events, address) {
  const groupedByCid = new Map();

  events
    .filter(
      (e) =>
        e._depositor?.toLowerCase() === address?.toLowerCase() &&
        ["TestamentDeposited", "TestamentApproved", "TestamentRejected", "TestamentOutdated"].includes(e.type)
    )
    .forEach((event) => {
      const key = event.cid;
      if (!key) return;

      if (!groupedByCid.has(key)) {
        groupedByCid.set(key, []);
      }

      groupedByCid.get(key).push(event);
    });

  const rawTestaments = [];

  groupedByCid.forEach((eventList, cid) => {
    const sorted = eventList.sort((a, b) => a.timestamp - b.timestamp);

    const dominantEvent = sorted.reduce((prev, current) => {
      const prevScore = statusPriority[prev.type] ?? -1;
      const currentScore = statusPriority[current.type] ?? -1;
      return currentScore > prevScore ? current : prev;
    }, sorted[0]);

    rawTestaments.push({
      cid,
      rawStatus: dominantEvent.type,
      lastTimestamp: sorted[sorted.length - 1].timestamp,
    });
  });

  // Trier pour trouver le testament approuvé le plus récent
  rawTestaments.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  const latestApproved = rawTestaments.find((t) => t.rawStatus === "TestamentApproved");

  // Appliquer logique finale
  const processed = rawTestaments.map((t) => {
    let status = statusMapping[t.rawStatus] || t.rawStatus;

    if (t.rawStatus === "TestamentApproved") {
      status = latestApproved?.cid === t.cid ? "Approved" : "Outdated";
    } else if (t.rawStatus === "TestamentDeposited") {
      status = latestApproved ? "Outdated" : "Pending";
    } else if (t.rawStatus === "TestamentRejected") {
      status = "Rejected";
    } else if (t.rawStatus === "TestamentOutdated") {
      status = "Outdated";
    }

    return status;
  });

  // Agrégation pour la pie chart
  const countMap = processed.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(countMap).map(([status, value]) => ({
    name: STATUS_LABELS[status] || status,
    value,
    color: STATUS_COLORS[status] || "#000000",
  }));
}

export default function ResponsivePieChart({ events, address }) {
  const data = computeLogicalStatuses(events, address);

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
