// Every request that comes through the sites is sent to one inbox.
// Set NOTIFY_EMAIL (falls back to ADMIN_EMAIL). Mail goes out through
// Resend when RESEND_API_KEY is set; otherwise the message is logged so
// nothing is lost while the key is missing. This never throws: a failed
// notification must not fail the seller's or agent's request.

export const REQUEST_INBOX_FALLBACK = "aledmorgan@gmail.com";

export function requestInbox(): string {
  return (
    (process.env.NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase() ||
    REQUEST_INBOX_FALLBACK
  );
}

export function mailtoWithCopy(to: string, params: Record<string, string>) {
  const query = new URLSearchParams({ cc: requestInbox(), ...params });
  return `mailto:${to}?${query.toString()}`;
}

export type RequestNotice = {
  kind: string; // "lead" | "lead-unlock" | "developer-claim" | "represent" | "choose-agent" | "advertise" | "agent-register" | "solicitor-register"
  subject: string;
  lines: (string | null | undefined | false)[];
};

export async function notifyRequest(notice: RequestNotice): Promise<void> {
  const to = requestInbox();
  const text = notice.lines.filter((line): line is string => Boolean(line)).join("\n");
  const subject = `[${notice.kind}] ${notice.subject}`;
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  const from = (process.env.MAIL_FROM ?? "").trim() || "Sell My House <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(`[request → ${to}] ${subject}\n${text}`);
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!response.ok) {
      console.error(`[request → ${to}] mail failed ${response.status}: ${await response.text()}\n${subject}\n${text}`);
    }
  } catch (error) {
    console.error(`[request → ${to}] mail failed: ${String(error)}\n${subject}\n${text}`);
  }
}
