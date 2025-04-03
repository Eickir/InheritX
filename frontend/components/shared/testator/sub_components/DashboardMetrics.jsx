import { ScrollText, ShieldCheck, Coins, Banknote, Lock } from "lucide-react";
import { formatUnits } from "viem";

export default function DashboardMetrics({
  testamentCount,
  testamentInfo,
  balanceINHX,
  balanceMUSDT,
  stakedINHX,
}) {
  const statusMapping = { 0: "Pending", 1: "Rejected", 2: "Accepted", 3: "Outdated" };

  const formattedINHX = balanceINHX
    ? Number(formatUnits(balanceINHX, 18))
    : 0;

  const formattedStaked = stakedINHX
    ? Number(formatUnits(stakedINHX, 18))
    : 0;

  const formattedMUSDT = balanceMUSDT
    ? Number(formatUnits(balanceMUSDT, 18)).toFixed(2)
    : "0";

  const stakingRatio = formattedINHX + formattedStaked > 0
    ? ((formattedStaked / (formattedINHX + formattedStaked)) * 100).toFixed(1)
    : "0";

  return [
    {
      label: "Testaments déposés",
      value: testamentCount || "0",
      icon: <ScrollText className="w-6 h-6 text-blue-600" />,
    },
    {
      label: "Statut du dernier testament",
      value:
        testamentInfo && testamentInfo.cid
          ? statusMapping[testamentInfo.status] || testamentInfo.status
          : "-",
      icon: <ShieldCheck className="w-6 h-6 text-purple-600" />,
    },
    {
      label: "Tokens INHX disponibles",
      value: formattedINHX.toFixed(2),
      icon: <Coins className="w-6 h-6 text-yellow-500" />,
    },
    {
      label: "Tokens INHX stakés",
      value: `${formattedStaked.toFixed(2)} (${stakingRatio}%)`,
      icon: <Lock className="w-6 h-6 text-emerald-600" />,
    },
  ];
}
