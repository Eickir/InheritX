// components/shared/validator_dashboard/ValidatorMetrics.js
import { ScrollText, ShieldCheck, Lock, ThumbsDown } from "lucide-react";
import { formatUnits } from "viem";

export default function ValidatorMetrics({ pendingCount, checkedCount, rejectedRatio, stakedINHX }) {
  const formattedStaked = stakedINHX
    ? Number(formatUnits(stakedINHX, 18)).toFixed(2)
    : "0.00";

  return [
    {
      label: "Testaments en attente",
      value: pendingCount || "0",
      icon: <ScrollText className="w-6 h-6 text-blue-600" />,
    },
    {
      label: "Testaments checkés",
      value: checkedCount || "0",
      icon: <ShieldCheck className="w-6 h-6 text-purple-600" />,
    },
    {
      label: "% refusés",
      value: rejectedRatio || "0%",
      icon: <ThumbsDown className="w-6 h-6 text-red-500" />,
    },
    {
      label: "INHX stakés",
      value: `${formattedStaked} INHX`,
      icon: <Lock className="w-6 h-6 text-emerald-600" />,
    },
  ];
}
