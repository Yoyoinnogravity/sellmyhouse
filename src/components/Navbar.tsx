import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-sm">
        <Link href="/" className="shrink-0 font-semibold tracking-tight whitespace-nowrap">
          Sell My House
        </Link>
        <Link href="/properties" className="whitespace-nowrap">
          Properties
        </Link>
        <Link href="/sell" className="whitespace-nowrap">
          Sell
        </Link>
        <Link href="/agents" className="whitespace-nowrap">
          Agents
        </Link>
        <Link href="/solicitors" className="whitespace-nowrap">
          Solicitors
        </Link>
        <Link href="/agents/upload" className="whitespace-nowrap">
          Upload
        </Link>
        <Link href="/dashboard" className="whitespace-nowrap">
          Dashboard
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-6">
          <Link href="/login" className="whitespace-nowrap">
            Log in
          </Link>
          <Link href="/register" className="whitespace-nowrap">
            Register
          </Link>
        </div>
      </nav>
    </header>
  );
}
