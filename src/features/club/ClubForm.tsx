"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Crosshair } from "lucide-react";
import { registerClub, type ClubState } from "@/app/club/actions";
import { Button, Card, Field, Input, Select } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Registering…" : "Register club"}
    </Button>
  );
}

const TIMEZONES = [
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Riyadh",
  "Europe/London",
  "Europe/Madrid",
  "America/New_York",
  "UTC",
];

export function ClubForm() {
  const [state, formAction] = useActionState<ClubState, FormData>(registerClub, {});
  const [coords, setCoords] = useState<{ lat: string; lng: string }>({
    lat: "",
    lng: "",
  });
  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <Field label="Club name">
          <Input name="name" required maxLength={80} placeholder="Dune Padel Club" />
        </Field>

        <Field label="Description" hint="Optional. One or two lines players will read.">
          <Input name="description" maxLength={400} />
        </Field>

        <Field label="Street address">
          <Input name="address" maxLength={160} placeholder="Al Quoz Industrial 3" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <Input name="city" required placeholder="Dubai" />
          </Field>
          <Field label="Country">
            <Input name="country" placeholder="AE" maxLength={60} />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium text-chalk-300">
              Map position
            </legend>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={useMyLocation}
              disabled={locating}
            >
              <Crosshair size={13} aria-hidden="true" />
              {locating ? "Locating…" : "Use my location"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              name="lat"
              required
              type="number"
              step="any"
              min={-90}
              max={90}
              placeholder="Latitude"
              aria-label="Latitude"
              value={coords.lat}
              onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))}
            />
            <Input
              name="lng"
              required
              type="number"
              step="any"
              min={-180}
              max={180}
              placeholder="Longitude"
              aria-label="Longitude"
              value={coords.lng}
              onChange={(e) => setCoords((c) => ({ ...c, lng: e.target.value }))}
            />
          </div>
          <p className="text-xs text-chalk-600">
            This is where your pin sits on the map. Stand at the club and tap “use my
            location”, or copy the coordinates from any map app.
          </p>
        </fieldset>

        <Field label="Time zone" hint="Match times are shown to players in this zone.">
          <Select name="timezone" defaultValue="Asia/Dubai">
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens">
            <Input type="time" name="opens_at" required defaultValue="06:00" />
          </Field>
          <Field label="Closes">
            <Input type="time" name="closes_at" required defaultValue="23:00" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Price/hour">
            <Input type="number" name="price_per_hour" min={0} step="1" required defaultValue={150} />
          </Field>
          <Field label="Currency">
            <Select name="currency" defaultValue="AED">
              {["AED", "USD", "EUR", "GBP", "PKR", "SAR"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Courts">
            <Input type="number" name="court_count" min={1} max={30} required defaultValue={2} />
          </Field>
        </div>

        <Field label="Phone" hint="Optional. Shown on your public page.">
          <Input name="phone" maxLength={30} placeholder="+971 4 000 0000" />
        </Field>

        {state.error ? (
          <p role="alert" className="rounded-xl bg-flag-red/10 p-3 text-sm text-flag-red">
            {state.error}
          </p>
        ) : null}

        <Submit />
      </form>
    </Card>
  );
}
