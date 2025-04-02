import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

const statusMapping = {
  TestamentDeposited: "Pending",
  TestamentApproved: "Approved",
  TestamentRejected: "Rejected",
  TestamentOutdated: "Outdated",
};

const validityMapping = {
  TestamentDeposited: "Active",
  TestamentApproved: "Active",
  TestamentRejected: "Inactive",
  TestamentOutdated: "Outdated",
};

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
  Outdated: "bg-gray-100 text-gray-800",
};

const validityColors = {
  Active: "bg-green-100 text-green-800",
  Inactive: "bg-red-100 text-red-800",
  Outdated: "bg-gray-100 text-gray-800",
};

export default function TestamentStatusTable({ events, address }) {
  const testaments = useMemo(() => {
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

    const result = [];

    groupedByCid.forEach((eventList, cid) => {
      const sorted = eventList.sort((a, b) => a.timestamp - b.timestamp);
      const firstEvent = sorted[0];
      const lastEvent = sorted[sorted.length - 1];

      const status = statusMapping[lastEvent.type] || lastEvent.type;
      const validity = validityMapping[lastEvent.type] || "Unknown";

      result.push({
        cid,
        first_state_timestamp: firstEvent.timestamp,
        last_state_timestamp: lastEvent.timestamp,
        rawStatus: lastEvent.type,
        status,
        validity,
      });
    });

    result.sort((a, b) => b.last_state_timestamp - a.last_state_timestamp);

    return result;
  }, [events, address]);

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold mb-4">Mes testaments déposés</h2>
        {testaments.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">CID</th>
                <th className="py-2">Déposé le</th>
                <th className="py-2">Dernier état</th>
                <th className="py-2">Validité</th>
                <th className="py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {testaments.map((t) => (
                <tr key={`${t.cid}-${t.last_state_timestamp}`} className="border-b">
                  <td className="py-2 break-all">{t.cid}</td>
                  <td className="py-2">
                    {t.first_state_timestamp
                      ? new Date(t.first_state_timestamp * 1000).toLocaleString()
                      : "N/A"}
                  </td>
                  <td className="py-2">
                    {t.last_state_timestamp
                      ? new Date(t.last_state_timestamp * 1000).toLocaleString()
                      : "N/A"}
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        validityColors[t.validity] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {t.validity}
                    </span>
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[t.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">Aucun testament trouvé.</p>
        )}
      </CardContent>
    </Card>
  );
}
