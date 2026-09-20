import Link from "next/link";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata = {
  title: "Create your profile",
  description: "Join Volea and get matched with padel players at your level.",
};

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="font-display text-4xl font-light text-bone-100">
        Create your profile
      </h1>
      <p className="mt-1.5 text-sm text-bone-500">
        Everyone starts at level 2.0. Your level moves with every result you report.
      </p>

      <div className="mt-6">
        <AuthForm mode="signup" />
      </div>

      <p className="mt-6 text-center text-sm text-bone-500">
        Already play here?{" "}
        <Link href="/login" className="font-semibold text-gold-300 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
