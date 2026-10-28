import { redirect } from "next/navigation";

// Uploads no longer need an account. Signed-in agents still get their
// listings attached to their profile on the shared upload page.
export default function AgentUploadPage() {
  redirect("/upload");
}
