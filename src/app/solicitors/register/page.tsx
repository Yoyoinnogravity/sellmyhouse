import { Suspense } from "react";
import SolicitorRegisterForm from "./register-form";

type RegisterSearchParams = {
  city?: string | string[];
  country?: string | string[];
};

export default function SolicitorRegisterPage({
  searchParams,
}: {
  searchParams: Promise<RegisterSearchParams>;
}) {
  return (
    <Suspense fallback={<p className="px-6 py-16">Loading…</p>}>
      <RegisterForm searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterForm({
  searchParams,
}: {
  searchParams: Promise<RegisterSearchParams>;
}) {
  const params = await searchParams;
  return (
    <SolicitorRegisterForm
      region={firstValue(params.city)}
      country={firstValue(params.country)}
    />
  );
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
