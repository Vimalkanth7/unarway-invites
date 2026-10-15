"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

function formatExpiry(paidAt: string, expiryMonths: number): string {
  const expiry = new Date(paidAt);
  expiry.setMonth(expiry.getMonth() + expiryMonths);
  return expiry.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The hosted link is the actual deliverable now, not the ZIP -- this is the
 * one place that turns a short_id into something a non-technical couple can
 * actually send: a copyable link, a WhatsApp share, and a QR code for print.
 */
export function PublishedShare({
  shortId,
  paidAt,
  expiryMonths,
}: {
  shortId: string;
  paidAt: string | null;
  expiryMonths: number;
}) {
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/i/${shortId}`;
    setHostedUrl(url);
    QRCode.toDataURL(url, { width: 480, margin: 1 })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR code generation failed:", err));
  }, [shortId]);

  async function copyLink() {
    if (!hostedUrl) return;
    try {
      await navigator.clipboard.writeText(hostedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy to clipboard failed:", err);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4">
      <div>
        <p className="font-medium text-emerald-700">Published</p>
        {paidAt && (
          <p className="text-xs text-neutral-500">Live until {formatExpiry(paidAt, expiryMonths)}</p>
        )}
      </div>

      {hostedUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={hostedUrl}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-sm underline"
          >
            {hostedUrl}
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:border-neutral-500"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`You're invited! ${hostedUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:border-neutral-500"
          >
            Share on WhatsApp
          </a>
        </div>
      )}

      {qrDataUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR code linking to the hosted invitation"
            className="h-20 w-20 rounded-lg border border-neutral-200"
          />
          <a href={qrDataUrl} download="invitation-qr.png" className="text-xs text-neutral-600 underline">
            Download QR (PNG)
          </a>
        </div>
      )}
    </div>
  );
}
