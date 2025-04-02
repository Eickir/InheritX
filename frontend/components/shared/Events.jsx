import { useState } from "react";
import { ScrollText, ChevronDown, ChevronUp, Filter, Download } from "lucide-react";
import { formatUnits } from "viem";
import dayjs from "dayjs";
import { Card, CardContent } from "@/components/ui/card";

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
    TestamentDeposited: "Testament Deposited",
    TestamentApproved: "Testament Approved",
    TestamentRejected: "Testament Rejected",
    TestamentOutdated: "Testament Outdated",
    SwapToken: "Swap Token",
    TokensStaked: "Tokens Staked",
    TokensWithdrawn: "Tokens Withdrawn",
    AddedToPool: "Added To Pool",
    RemovedFromPool: "Removed From Pool",
    MinStakeUpdated: "Min Stake Updated",
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
    <Card>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-blue-600">
            <ScrollText className="w-6 h-6" />
            Historique des événements
          </h2>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

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
              <option value="TestamentApproved">TestamentApproved</option>
              <option value="TestamentRejected">TestamentRejected</option>
              <option value="TestamentOutdated">TestamentOutdated</option>
              <option value="SwapToken">SwapToken</option>
              <option value="TokensStaked">TokensStaked</option>
              <option value="TokensWithdrawn">TokensWithdrawn</option>
              <option value="AddedToPool">AddedToPool</option>
              <option value="RemovedFromPool">RemovedFromPool</option>
              <option value="MinStakeUpdated">MinStakeUpdated</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Rechercher par dépositaire, user ou tx hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 w-full"
          />
        </div>

        {sortedEvents.length > 0 ? (
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
                      {eventTitles[event.type] || event.type}
                    </p>
                    <p className="text-sm text-gray-600">
                      Bloc: {event.blockNumber} - Tx: {event.transactionHash?.slice(0, 10)}...
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
                    {(event.type === "TestamentDeposited" ||
                      event.type === "TestamentApproved" ||
                      event.type === "TestamentRejected" ||
                      event.type === "TestamentOutdated") && (
                      <p>
                        <span className="font-semibold">Depositor:</span> {event._depositor}
                      </p>
                    )}

                    {event.type === "SwapToken" && (
                      <>
                        <p>
                          <span className="font-semibold">Swap:</span> {event._tokenSent} for {event._tokenReceived}
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

                    {(event.type === "TokensStaked" || event.type === "TokensWithdrawn") && (
                      <>
                        <p>
                          <span className="font-semibold">Utilisateur:</span> {event.user}
                        </p>
                        <p>
                          <span className="font-semibold">Montant:</span> {event.amount}
                        </p>
                      </>
                    )}

                    {(event.type === "AddedToPool" || event.type === "RemovedFromPool") && (
                      <p>
                        <span className="font-semibold">Utilisateur:</span> {event.user}
                      </p>
                    )}

                    {event.type === "MinStakeUpdated" && (
                      <p>
                        <span className="font-semibold">Nouveau stake minimum:</span> {event.newMinStake}
                      </p>
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
      </CardContent>
    </Card>
  );
}
