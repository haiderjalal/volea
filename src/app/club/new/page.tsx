import { ClubForm } from "@/features/club/ClubForm";

export const metadata = {
  title: "Register your club",
  description:
    "List your padel courts on Volea. Take matchmade bookings and see how your courts perform.",
};

export default function NewClubPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <header>
        <h1 className="font-display text-4xl font-light text-bone-100">
          Register your club
        </h1>
        <p className="mt-1.5 text-sm text-bone-500">
          Once you are listed, Volea sends matchmade groups straight to your courts and
          you get a dashboard showing occupancy, revenue and who keeps coming back.
        </p>
      </header>

      <ClubForm />
    </div>
  );
}
