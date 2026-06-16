import type { Shoe } from "@prisma/client";
import { Footprints } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { formatMiles } from "@/lib/format";

export function ShoeCard({
  shoe,
  runs,
}: {
  shoe: Pick<Shoe, "name" | "totalMiles" | "mileageLimit" | "retired">;
  runs?: number;
}) {
  const pct = shoe.mileageLimit > 0 ? (shoe.totalMiles / shoe.mileageLimit) * 100 : 0;
  const tone = pct >= 100 ? "injury" : pct >= 85 ? "warning" : "brand";
  const remaining = Math.max(0, shoe.mileageLimit - shoe.totalMiles);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-gray-500">
            <Footprints className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-ink">{shoe.name}</p>
            <p className="text-xs text-gray-400">
              {runs != null ? `${runs} runs · ` : ""}
              {formatMiles(remaining)} mi left
            </p>
          </div>
        </div>
        {shoe.retired ? (
          <Badge tone="neutral">Retired</Badge>
        ) : pct >= 100 ? (
          <Badge tone="injury">Replace</Badge>
        ) : pct >= 85 ? (
          <Badge tone="warning">Worn</Badge>
        ) : (
          <Badge tone="success">Fresh</Badge>
        )}
      </div>
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-500">
          <span className="text-ink">{formatMiles(shoe.totalMiles)} mi</span>
          <span>limit {formatMiles(shoe.mileageLimit, 0)} mi</span>
        </div>
        <Progress value={pct} tone={tone} />
      </div>
    </Card>
  );
}
