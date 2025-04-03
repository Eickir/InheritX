import { parseAbiItem, formatUnits } from "viem";

export default function DashboardMetrics({ testamentCount, testamentInfo, balanceINHX, balanceMUSDT }) {
  const statusMapping = { 0: "Pending", 1: "Rejected", 2: "Accepted", 3: "Outdated" };
  const formattedINHX = balanceINHX ? Number(formatUnits(balanceINHX, 18)).toFixed(2) : "0";
  const formattedMUSDT = balanceMUSDT ? Number(formatUnits(balanceMUSDT, 18)).toFixed(2) : "0";

  return [
    {
      label: "Testaments déposés",
      value: testamentCount || "0",
    },
    {
      label: "Statut du dernier testament",
      value: testamentInfo && testamentInfo.cid
        ? statusMapping[testamentInfo.status] || testamentInfo.status
        : "-",
    },
    {
      label: "Tokens INHX disponibles",
      value: formattedINHX,
    },
    {
      label: "Tokens MUSDT disponibles",
      value: formattedMUSDT,
    },
  ];
}
