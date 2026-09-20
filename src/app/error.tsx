"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error", { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="p-6 text-center">
        <h1 className="font-display text-3xl font-light text-bone-100">Something went wrong</h1>
        <p className="mt-2 text-sm text-bone-500">
          That is on us, not you. Try again — if it keeps happening, come back in a few
          minutes.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RotateCcw size={15} aria-hidden="true" />
          Try again
        </Button>
      </Card>
    </div>
  );
}
