import type { Metadata } from "next";
import Link from "next/link";
import { FormatDownloads } from "@/components/format-downloads";
import UploadFile from "./upload-file";

export const metadata: Metadata = {
  title: "Upload your listings",
  description: "Upload a spreadsheet of properties. Free, no account needed.",
};

export default function UploadPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Upload your listings</h1>
        <p className="text-lg text-zinc-700">
          Fill in the template, then upload it here. Free, no account, and your listings go on the world map
          straight away. Selling just one home? The <Link href="/sell" className="underline">one-page form</Link> is
          quicker and takes photos from your phone.
        </p>
      </div>
      <UploadFile />
      <FormatDownloads compact />
    </main>
  );
}
