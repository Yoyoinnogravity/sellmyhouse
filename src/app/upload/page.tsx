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
          Realtors and individual sellers both upload here. Use either format below, fill it in, and upload it.
          Free, no account, and your listings go on the world map straight away.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <a href="/sell" className="flex flex-col border-2 border-zinc-300 p-3 hover:border-zinc-900">
            <span className="font-semibold">Just one property?</span>
            <span className="text-sm text-zinc-600">Use the one-page form. It takes photos from your phone.</span>
          </a>
          <a href="/sell?as=realtor" className="flex flex-col border-2 border-zinc-300 p-3 hover:border-zinc-900">
            <span className="font-semibold">Realtor with one listing?</span>
            <span className="text-sm text-zinc-600">The same form, with your agency shown to buyers.</span>
          </a>
        </div>
      </div>
      <UploadFile />
      <FormatDownloads audience="sellers" compact />
      <FormatDownloads compact />
    </main>
  );
}
