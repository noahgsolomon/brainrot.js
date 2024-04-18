import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <Card className="shadow-none">
      <CardHeader className="gap-8">
        <Skeleton className="h-5 w-1/5" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardContent className="h-12" />
      <CardFooter>
        <Skeleton className="h-10 w-[120px]" />
      </CardFooter>
    </Card>
  );
}
