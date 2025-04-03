import { useState } from "react";
import { ChevronDown, ChevronUp, Filter, Download } from "lucide-react";
import { formatUnits } from "viem";
import dayjs from "dayjs";

export default function EventLogList({ events }) {
  const [expandedEventIndex, setExpandedEventIndex] = useState(null);
  const [filterType, setFilterType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const toggleExpand = (index) => {
    setExpandedEventIndex(expandedEventIndex === index ? null : index);
  };

  const filteredEvents = events.filter((event) => {
    if (filterType !== "All" && event.type !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (event._depositor && event._depositor.toLowerCase().includes(term)) ||
        (event.user && event.user.toLowerCase().includes(term)) ||
        (event.transactionHash && event.transactionHash.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const sortedEvents = filteredEvents.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return Number(b.blockNumber) - Number(a.blockNumber);
  });

  const eventTitles = {
    TestamentDeposited: "Testament Déposé",
    TestamentApproved: "Testament Approuvé",
    TestamentRejected: "Testament Rejeté",
    TestamentOutdated: "Testament Obsolète",
    SwapToken: "Swap Token",
    TokensStaked: "Tokens Stakés",
    TokensWithdrawn: "Tokens Retirés",
    AddedToPool: "Ajout au Pool",
    RemovedFromPool: "Retrait du Pool",
    MinStakeUpdated: "Min Stake Modifié",
  };

  const exportToCSV = () => {
    const headers = ["Type", "Depositor/User", "TransactionHash", "Block", "Date"];
    const csvRows = [headers.join(",")];

    sortedEvents.forEach((event) => {
      const row = [
        event.type,
        event._depositor || event.user || "",
        event.transactionHash,
        event.blockNumber,
        event.timestamp
          ? dayjs(event.timestamp * 1000).format("YYYY-MM-DD HH:mm:ss")
          : "",
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "events.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters & Export */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="All">Tous</option>
            {Object.keys(eventTitles).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <input
          type="text"
          placeholder="Rechercher un déposant, utilisateur ou hash..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 text-sm w-full sm:w-auto"
        />
        <button
          onClick={exportToCSV}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Event list */}
      {sortedEvents.length > 0 ? (
        <div className="space-y-4 overflow-y-auto flex-1">
          {sortedEvents.map((event, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 hover:shadow-md transition cursor-pointer"
              onClick={() => toggleExpand(index)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-base font-medium text-blue-600">
                    {eventTitles[event.type] || event.type}
                  </p>
                  <p className="text-xs text-gray-600">
                    Bloc: {event.blockNumber} – Tx: {event.transactionHash?.slice(0, 10)}...
                  </p>
                </div>
                <div>
                  {expandedEventIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>

              {expandedEventIndex === index && (
                <div className="mt-4 text-sm text-gray-700 space-y-1">
                  {event._depositor && <p><span className="font-semibold">Déposant:</span> {event._depositor}</p>}
                  {event.user && <p><span className="font-semibold">Utilisateur:</span> {event.user}</p>}
                  {event.amount && <p><span className="font-semibold">Montant:</span> {event.amount}</p>}
                  {event.newMinStake && <p><span className="font-semibold">Min stake:</span> {event.newMinStake}</p>}
                  {event._tokenSent && (
                    <p><span className="font-semibold">Swap:</span> {event._tokenSent} → {event._tokenReceived}</p>
                  )}
                  {event.timestamp && (
                    <p>
                      <span className="font-semibold">Date:</span>{" "}
                      {dayjs(event.timestamp * 1000).format("YYYY-MM-DD HH:mm:ss")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
          Aucun événement trouvé...
        </div>
      )}
    </div>
  );
}
