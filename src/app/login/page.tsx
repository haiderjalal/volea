import Link from "next/link";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to Volea to find padel games near you.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-chalk-100">
        Welcome back
      </h1>
      <p className="mt-1.5 text-sm text-chalk-500">
        Sign in to join the queue and see your matches.
      </p>

      {error === "confirm" ? (
        <p role="alert" className="mt-4 rounded-xl bg-flag-red/10 p-3 text-sm text-flag-red">
          That confirmation link has expired. Sign in to get a new one.
        </p>
      ) : null}

      <div className="mt-6">
        <AuthForm mode="signin" next={next} />
      </div>

      <p className="mt-6 text-center text-sm text-chalk-500">
        New to Volea?{" "}
        <Link href="/signup" className="font-semibold text-ball-400 hover:underline">
          Create a profile
        </Link>
      </p>
    </div>
  );
}
