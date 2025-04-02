// DashboardMetrics.jsx
import { Card, CardContent } from "@/components/ui/card";
import { formatUnits } from "viem";

export default function DashboardMetrics({ testamentCount, testamentInfo, balanceINHX, balanceMUSDT }) {
  // Vous pouvez passer les valeurs en props ou les récupérer via des hooks personnalisés
  const statusMapping = { 0: "Pending", 1: "Rejected", 2: "Accepted", 3: "Outdated" };
  const formattedINHX = balanceINHX ? Number(formatUnits(balanceINHX, 18)).toFixed(2) : "0";
  const formattedMUSDT = balanceMUSDT ? Number(formatUnits(balanceMUSDT, 18)).toFixed(2) : "0";

  return (
    <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="flex flex-col items-center">
          <span className="text-sm text-gray-600">Testaments déposés</span>
          <span className="text-2xl font-bold">{testamentCount || "0"}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center">
          <span className="text-sm text-gray-600">Statut du dernier testament</span>
          <span className="text-2xl font-bold">
            {testamentInfo && testamentInfo.cid
              ? statusMapping[testamentInfo.status] || testamentInfo.status
              : "-"}
          </span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center">
          <span className="text-sm text-gray-600">Tokens INHX disponibles</span>
          <span className="text-2xl font-bold">{formattedINHX}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center">
          <span className="text-sm text-gray-600">Tokens MUSDT disponibles</span>
          <span className="text-2xl font-bold">{formattedMUSDT}</span>
        </CardContent>
      </Card>
    </section>
  );
}
