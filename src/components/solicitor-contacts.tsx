export function SolicitorContacts({
  phone,
  email,
}: {
  phone: string;
  email: string;
}) {
  const phones = phone
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.replace(/\D/g, "").length >= 6);

  return (
    <>
      {phones.map((number) => (
        <p key={number}>
          <a href={telephoneHref(number)}>{number}</a>
        </p>
      ))}
      {email ? (
        <p>
          <a href={`mailto:${email}`}>{email}</a>
        </p>
      ) : null}
    </>
  );
}

function telephoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+") || digits.startsWith("60")) {
    return `tel:+${digits}`;
  }
  return `tel:${digits}`;
}
