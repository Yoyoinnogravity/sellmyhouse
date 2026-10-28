import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listAgents } from "@/lib/agent";

export default function AgentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
      <p>Realtors can add their contact details and the region they cover.</p>
      <p className="flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/agents/register">Add your details and region</Link>
        <Link href="/agents/login">Log in</Link>
        <Link href="/agents/upload">Upload many listings at once</Link>
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <AgentDirectory />
      </Suspense>
    </main>
  );
}

async function AgentDirectory() {
  await connection();
  const agents = await listAgents();

  if (agents.length === 0) {
    return (
      <p>
        No realtors registered yet. <Link href="/agents/register">Add your details and region</Link>
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-6">
      {agents.map((agent) => (
        <li key={agent.id}>
          <Link href={`/agents/${agent.id}`}>{agent.name}</Link>
          <p>{agent.agency}</p>
          <p>{[agent.city, agent.country].filter(Boolean).join(", ")}</p>
          <p>{agent.phone}</p>
          <p>{agent.email}</p>
          {agent.license ? <p>{agent.license}</p> : null}
        </li>
      ))}
    </ul>
  );
}
