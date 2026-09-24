import Link from "next/link";
import { Building2 } from "lucide-react";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata = {
  title: "Club owner sign in",
  description: "Sign in to manage your padel club, courts, bookings and results.",
};

export default function ClubLoginPage() {
  return (
    <div className="mx-auto max-w-sm py-8">
      <Building2 size={26} className="text-court-300" aria-hidden="true" />
      <h1 className="mt-5 font-display text-4xl font-light text-bone-100">
        Club owner sign in
      </h1>
      <p className="mt-1.5 text-sm text-bone-500">
        Open your booking calendar, record results and manage your venue.
      </p>
      <div className="mt-6">
        <AuthForm mode="signin" next="/club" accountType="club_owner" />
      </div>
      <p className="mt-6 text-center text-sm text-bone-500">
        Listing a club for the first time?{" "}
        <Link href="/club/signup" className="font-semibold text-gold-300 hover:underline">
          Register as an owner
        </Link>
      </p>
    </div>
  );
}
