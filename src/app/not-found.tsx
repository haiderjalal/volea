import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="p-6 text-center">
        <p className="text-4xl font-extrabold text-ball-400">404</p>
        <h1 className="mt-2 text-lg font-bold text-chalk-100">Out of bounds</h1>
        <p className="mt-2 text-sm text-chalk-500">
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
