import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ label, value }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-2xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}