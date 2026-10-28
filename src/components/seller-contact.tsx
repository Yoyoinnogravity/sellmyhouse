// Big, obvious ways to reach a private seller: call, WhatsApp, email.
// Numbers come from sellers worldwide, so they are used as typed; a local
// Malaysian number starting with 0 is given +60 so WhatsApp can open it.

function internationalDigits(phone: string, location: string): string {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, "")
  if (trimmed.startsWith("+")) return digits
  if (digits.startsWith("00")) return digits.slice(2)
  if (digits.startsWith("0") && /malaysia/i.test(location)) return `60${digits.slice(1)}`
  return digits
}

export function SellerContact({
  name,
  phone,
  email,
  title,
  location,
  heading = "Contact the seller",
  rental = false,
}: {
  name: string | null
  phone: string | null
  email: string | null
  title: string
  location: string
  heading?: string
  rental?: boolean
}) {
  const digits = phone ? internationalDigits(phone, location) : ""
  const message = rental
    ? `Hello, I saw your rental "${title}". Is it still available? I'd like to arrange a viewing.`
    : `Hello, I saw your listing "${title}" and I'm interested.`
  const button = "inline-flex min-h-[48px] flex-1 items-center justify-center px-4 font-semibold sm:flex-none"

  return (
    <section className="flex flex-col gap-3 border-2 border-zinc-900 p-4">
      <div>
        <h2 className="text-lg font-semibold">{heading}</h2>
        {name ? <p className="text-zinc-700">{name}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {phone ? (
          <a href={`tel:${phone.trim().startsWith("+") ? "+" : ""}${phone.replace(/\D/g, "")}`} className={`${button} bg-zinc-900 text-white`}>
            Call
          </a>
        ) : null}
        {digits.length >= 7 ? (
          <a
            href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${button} bg-green-600 text-white`}
          >
            WhatsApp
          </a>
        ) : null}
        {email ? (
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`}
            className={`${button} border-2 border-zinc-900`}
          >
            Email
          </a>
        ) : null}
      </div>
      <p className="text-sm text-zinc-600">
        {phone || email
          ? `${[phone, email].filter(Boolean).join(" · ")}. No account needed, and no fees for ${rental ? "tenants" : "buyers"}.`
          : "The seller hasn't added a phone number or email yet. Check back soon."}
      </p>
    </section>
  )
}
