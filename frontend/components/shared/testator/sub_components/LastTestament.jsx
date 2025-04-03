// LastTestament.jsx
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export default function LastTestament({ testamentInfo }) {
  const statusMapping = {
    0: "Pending",
    1: "Rejected",
    2: "Accepted",
    3: "Outdated",
  };

  return (
    <>
      <h3>Dernier Testament</h3>
      {testamentInfo && testamentInfo.cid ? (
        <div>
          <p>
            <strong>CID :</strong> <span>{testamentInfo.cid}</span>
          </p>
          <p>
            <strong>Statut :</strong> {statusMapping[testamentInfo.status] || testamentInfo.status}
          </p>
          <p>
            <strong>Déposé le :</strong>{" "}
            {dayjs.unix(Number(testamentInfo.depositTimestamp)).utc().format("YYYY-MM-DD HH:mm:ss")}
          </p>
        </div>
      ) : (
        <p>Aucun testament enregistré.</p>
      )}
    </>
  );
}
