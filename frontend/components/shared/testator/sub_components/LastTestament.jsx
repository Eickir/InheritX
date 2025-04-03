// LastTestament.jsx
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

// Supprime le <h3> du composant, on le gère dans le parent
export default function LastTestament({ testamentInfo }) {
  const statusMapping = {
    0: "Pending",
    1: "Rejected",
    2: "Accepted",
    3: "Outdated",
  };

  return (
    <div className="space-y-2 text-sm text-gray-700">
      {testamentInfo && testamentInfo.cid ? (
        <>
          <div className="flex items-start gap-1">
            <span className="font-medium text-gray-600">CID :</span>
            <span className="break-all">{testamentInfo.cid}</span>
          </div>

          <div className="flex items-start gap-1">
            <span className="font-medium text-gray-600">Statut :</span>
            <span>{statusMapping[testamentInfo.status] || testamentInfo.status}</span>
          </div>

          <div className="flex items-start gap-1">
            <span className="font-medium text-gray-600">Déposé le :</span>
            <span>
              {dayjs
                .unix(Number(testamentInfo.depositTimestamp))
                .utc()
                .format("YYYY-MM-DD HH:mm:ss")}
            </span>
          </div>
        </>
      ) : (
        <p className="text-gray-500 italic">Aucun testament enregistré.</p>
      )}
    </div>
  );
}
