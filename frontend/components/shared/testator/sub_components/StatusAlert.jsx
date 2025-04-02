// StatusAlert.jsx
import { Loader2, PartyPopper, XCircle } from "lucide-react";

export default function StatusAlert({ status }) {
  if (!status) return null;
  let containerClass = "flex items-center gap-2 border-l-4 p-4 mt-4";
  let icon = null;
  switch (status.type) {
    case "pending":
      containerClass += " border-yellow-500 bg-yellow-50";
      icon = <Loader2 className="text-yellow-600 w-6 h-6 animate-spin" />;
      break;
    case "success":
      containerClass += " border-green-500 bg-green-50";
      icon = <PartyPopper className="text-green-500 w-6 h-6" />;
      break;
    case "error":
      containerClass += " border-red-500 bg-red-50";
      icon = <XCircle className="text-red-500 w-6 h-6" />;
      break;
    default:
      break;
  }
  return (
    <div className={containerClass}>
      {icon}
      <p className="text-sm">{status.text}</p>
    </div>
  );
}
