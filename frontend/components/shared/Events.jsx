import { useState } from "react";
import { ScrollText, ChevronDown, ChevronUp, Filter, Download } from "lucide-react";
import { formatUnits } from "viem";
import dayjs from "dayjs";

export default function EventLogList({ events }) {
  const [expandedEventIndex, setExpandedEventIndex] = useState(null);
  const [filterType, setFilterType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const toggleExpand = (index) => {
    setExpandedEventIndex(expandedEventIndex === index ? null : index);
  };

  // Filtrage des événements en fonction du type et d'une recherche par dépositaire ou transaction
  const filteredEvents = events.filter((event) => {
    if (filterType !== "All" && event.type !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (event._depositor && event._depositor.toLowerCase().includes(term)) ||
        (event.transactionHash && event.transactionHash.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // Tri par timestamp décroissant s'il existe, sinon par numéro de bloc décroissant
  const sortedEvents = filteredEvents.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return Number(b.blockNumber) - Number(a.blockNumber);
  });

  // Fonction pour exporter les événements filtrés en CSV
  const exportToCSV = () => {
    const headers = ["Type", "Depositor", "TransactionHash", "Block", "Date"];
    const csvRows = [headers.join(",")];

    sortedEvents.forEach((event) => {
      const row = [
        event.type,
        event._depositor || "",
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
    <div className="mt-10 w-full max-w-3xl mx-auto">
      {/* En-tête et bouton d'export */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-blue-600" />
          Event Logs
        </h2>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filtres et champ de recherche */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="All">Tous</option>
            <option value="TestamentDeposited">TestamentDeposited</option>
            <option value="SwapToken">SwapToken</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Rechercher par dépositaire ou tx hash..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 w-full"
        />
      </div>

      {sortedEvents.length > 0 ? (
        // Conteneur scrollable, ici avec une hauteur maximale pour environ 5 éléments
        <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "400px" }}>
          {sortedEvents.map((event, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 hover:shadow-md transition cursor-pointer"
              onClick={() => toggleExpand(index)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-medium text-blue-600">
                    {event.type === "TestamentDeposited"
                      ? "Testament Deposited"
                      : "Swap Token"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Block: {event.blockNumber} - Tx:{" "}
                    {event.transactionHash?.slice(0, 10)}...
                  </p>
                </div>
                <div>
                  {expandedEventIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </div>
              </div>
              {expandedEventIndex === index && (
                <div className="mt-4 text-sm text-gray-700">
                  {event.type === "TestamentDeposited" && (
                    <p>
                      <span className="font-semibold">Depositor:</span>{" "}
                      {event._depositor}
                    </p>
                  )}
                  {event.type === "SwapToken" && (
                    <>
                      <p>
                        <span className="font-semibold">Swap:</span>{" "}
                        {event._tokenSent} for {event._tokenReceived}
                      </p>
                      <p>
                        <span className="font-semibold">
                          {event._tokenReceived} Balance before swap:
                        </span>{" "}
                        {formatUnits(event._balanceBeforeTokenReceived, 18)}
                      </p>
                      <p>
                        <span className="font-semibold">
                          {event._tokenReceived} Balance after swap:
                        </span>{" "}
                        {formatUnits(event._balanceAfterTokenReceived, 18)}
                      </p>
                    </>
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
