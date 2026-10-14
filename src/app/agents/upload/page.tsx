import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAgentFromCookie } from "@/lib/agent";
import { getUserFromCookie } from "@/lib/session";
import UploadForm from "./upload-form";

export default function AgentUploadPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Upload listings</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <AuthorizedUpload />
      </Suspense>
    </main>
  );
}

async function AuthorizedUpload() {
  const user = await getUserFromCookie();
  const agent = await getAgentFromCookie();
  if (!user && !agent) {
    redirect("/login?next=/agents/upload");
  }
  return <UploadForm />;
}
