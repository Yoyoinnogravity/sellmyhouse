import { NavbarMenu } from "@/components/navbar-menu";
import { currentSite } from "@/lib/site";

export default async function Navbar() {
  const site = await currentSite();
  return (
    <header className="sticky top-0 z-[1000] border-b border-black/10 bg-white/95 backdrop-blur dark:border-white/15 dark:bg-black/90">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm sm:px-6">
        <NavbarMenu siteName={site.name} />
      </nav>
    </header>
  );
}
