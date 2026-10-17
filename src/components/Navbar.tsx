import { NavbarMenu } from "@/components/navbar-menu";
import { isAdminEmail } from "@/lib/developerAccess";
import { getUserFromCookie } from "@/lib/session";
import { currentSite } from "@/lib/site";

export default async function Navbar() {
  const [site, user] = await Promise.all([currentSite(), getUserFromCookie()]);
  return (
    <header className="sticky top-0 z-[1000] border-b border-black/10 bg-white/95 backdrop-blur dark:border-white/15 dark:bg-black/90">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm sm:px-6">
        <NavbarMenu siteName={site.name} admin={isAdminEmail(user?.email)} />
      </nav>
    </header>
  );
}
