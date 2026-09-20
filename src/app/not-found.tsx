import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="p-6 text-center">
        <p className="font-display text-6xl font-light text-gold-300">404</p>
        <h1 className="mt-3 font-display text-3xl font-light text-bone-100">Out of bounds</h1>
        <p className="mt-2 text-sm text-bone-500">
          That page is not here. The courts are, though.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/">
            <Button>Browse courts</Button>
          </Link>
          <Link href="/play">
            <Button variant="outline">Find a game</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
