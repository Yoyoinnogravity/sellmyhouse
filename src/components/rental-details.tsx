// Rent terms and a scam warning, shown on every rental listing.
export function RentalDetails({ metadata }: { metadata: Record<string, unknown> | null }) {
  const m = metadata ?? {};
  const rows: [string, string][] = [];
  if (typeof m.deposit === "number") rows.push(["Deposit", m.deposit.toLocaleString()]);
  if (typeof m.furnished === "string") rows.push(["Furnishing", m.furnished]);
  if (typeof m.availableFrom === "string") {
    const when = m.availableFrom === "Now"
      ? "Now"
      : new Date(`${m.availableFrom}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    rows.push(["Available from", when]);
  }
  rows.push(["Minimum lease", typeof m.minLeaseMonths === "number" ? `${m.minLeaseMonths} months` : "6 months or more"]);

  return (
    <section className="flex flex-col gap-3">
      {rows.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border p-4 sm:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-zinc-600">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-zinc-800">
        <strong>Stay safe:</strong> never pay a deposit or booking fee before you have viewed the property in person and
        signed a tenancy agreement. Be wary of anyone who can&apos;t show you inside.
      </p>
    </section>
  );
}
