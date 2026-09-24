import Link from "next/link";
import { Building2 } from "lucide-react";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata = {
  title: "Register as a club owner",
  description: "Create a Volea owner account and list your padel courts on the map.",
};

export default function ClubOwnerSignupPage() {
  return (
    <div className="mx-auto max-w-sm py-8">
      <Building2 size={26} className="text-court-300" aria-hidden="true" />
      <h1 className="mt-5 font-display text-4xl font-light text-bone-100">
        Register as a club owner
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-bone-500">
        Create your owner account first. Next, add your club, map location, opening hours and courts.
      </p>
      <div className="mt-6">
        <AuthForm mode="signup" accountType="club_owner" />
      </div>
      <p className="mt-6 text-center text-sm text-bone-500">
        Already registered?{" "}
        <Link href="/club/login" className="font-semibold text-gold-300 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
