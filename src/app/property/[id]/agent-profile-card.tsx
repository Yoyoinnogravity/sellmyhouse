"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export function AgentProfileCard({
  name,
  agency,
  city,
  phone,
  email,
  photo,
  chooseHref,
  profileHref,
}: {
  name: string;
  agency: string;
  city: string | null;
  phone: string;
  email: string;
  photo: string;
  chooseHref: string;
  profileHref: string;
}) {
  const router = useRouter();

  return (
    <article className="flex flex-col gap-2 border p-4">
      <Image src={photo} alt="" width={320} height={320} className="h-auto w-40" />
      <p>{name}</p>
      <p>{agency}</p>
      <p>{city}</p>
      <p>{phone}</p>
      <p>{email}</p>
      <p>Available</p>
      <p className="flex gap-4">
        <button type="button" onClick={() => router.push(chooseHref)}>
          Choose this agent
        </button>
        <button type="button" onClick={() => router.push(profileHref)}>
          View profile
        </button>
      </p>
    </article>
  );
}
