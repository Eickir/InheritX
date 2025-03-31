// LastTestament.jsx
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Card, CardContent } from "@/components/ui/card";
dayjs.extend(utc);

export default function LastTestament({ testamentInfo }) {
  return (
    <Card>
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Dernier Testament</h3>
        {testamentInfo && testamentInfo.cid ? (
          <div className="space-y-1 text-sm">
            <p>
              <strong>CID :</strong> <span className="break-all">{testamentInfo.cid}</span>
            </p>
            <p>
              <strong>Statut :</strong> {testamentInfo.status}
            </p>
            <p>
              <strong>Déposé le :</strong>{" "}
              {dayjs.unix(Number(testamentInfo.depositTimestamp)).utc().format("YYYY-MM-DD HH:mm:ss")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun testament enregistré.</p>
        )}
      </CardContent>
    </Card>
  );
}
