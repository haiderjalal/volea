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
        <h1 className="text-2xl font-extrabold tracking-tight text-chalk-100">
          Register your club
        </h1>
        <p className="mt-1.5 text-sm text-chalk-500">
          Once you are listed, Volea sends matchmade groups straight to your courts and
          you get a dashboard showing occupancy, revenue and who keeps coming back.
        </p>
      </header>

      <ClubForm />
    </div>
  );
}
