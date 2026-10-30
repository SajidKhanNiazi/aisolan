"use client";

import React, { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  Globe,
  Palette,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BusinessWithRole } from "@/features/organizations/types";

interface WidgetSettingsEditorProps {
  business: BusinessWithRole;
}

export function WidgetSettingsEditor({ business }: WidgetSettingsEditorProps) {
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [primaryColor, setPrimaryColor] = useState("#1852E8");
  const [buttonText, setButtonText] = useState("Book Appointment");
  const [allowedDomains, setAllowedDomains] = useState(
    business.website ? business.website.replace(/^https?:\/\//, "").split("/")[0] : ""
  );

  const widgetId = `wgt_${business.slug.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const appBaseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://bookzello.com";

  const embedSnippet = `<!-- Bookzello AI Booking Widget -->
<script
  src="${appBaseUrl}/widget.js"
  data-salon="${business.slug}"
  data-widget-id="${widgetId}"
  data-position="${position}"
  data-primary-color="${primaryColor}"
  data-button-text="${buttonText}"
  async>
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Embeddable AI Booking Widget</CardTitle>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                  Production Ready
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Install Bookzello on your WordPress, Webflow, Shopify, or custom website. Clients can chat with your AI receptionist and complete bookings without leaving your website.
              </CardDescription>
            </div>
            <div className="shrink-0">
              <a
                href={`/embed/${business.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1852E8] hover:underline"
              >
                <span>Preview Embed Window</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Identity & Multi-tenant Mapping */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500 font-medium block mb-1">Public Widget ID</span>
              <span className="font-mono font-semibold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                {widgetId}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-1">Assigned Salon ID</span>
              <span className="font-mono text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 inline-block truncate max-w-full">
                {business.id}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-1">Salon Handle</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block">
                {business.slug}
              </span>
            </div>
          </div>

          {/* Configuration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-[#1852E8]" />
                <span>Primary Brand Color</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value)}
                  className="h-9 w-10 p-0.5 rounded-lg border border-slate-200 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value)}
                  className="h-9 text-xs font-mono max-w-[140px] px-3 rounded-lg border border-slate-200 bg-white"
                />
                <div className="flex gap-1.5">
                  {["#1852E8", "#0F172A", "#059669", "#7C3AED", "#E11D48"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPrimaryColor(c)}
                      style={{ backgroundColor: c }}
                      className="h-6 w-6 rounded-full border border-white ring-1 ring-slate-200 hover:scale-110 transition-transform"
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Launcher Button Position
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="widget-position"
                    checked={position === "bottom-right"}
                    onChange={() => setPosition("bottom-right")}
                    className="text-[#1852E8]"
                  />
                  <span>Bottom Right (Recommended)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="widget-position"
                    checked={position === "bottom-left"}
                    onChange={() => setPosition("bottom-left")}
                    className="text-[#1852E8]"
                  />
                  <span>Bottom Left</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Button Display Text
              </label>
              <input
                type="text"
                value={buttonText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setButtonText(e.target.value)}
                placeholder="Book Appointment"
                className="h-9 text-xs px-3 rounded-lg border border-slate-200 bg-white w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <span>Allowed Host Domains</span>
              </label>
              <input
                type="text"
                value={allowedDomains}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAllowedDomains(e.target.value)}
                placeholder="e.g. mysalon.com, salon.co.uk"
                className="h-9 text-xs px-3 rounded-lg border border-slate-200 bg-white w-full"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Comma-separated domain list allowed to embed your booking widget.
              </span>
            </div>
          </div>

          {/* Installation Snippet */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-[#1852E8]" />
                <span>One-Line HTML Embed Code</span>
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="h-7 text-xs gap-1.5 font-semibold text-[#1852E8] border-blue-200 hover:bg-blue-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied Snippet!" : "Copy Snippet"}</span>
              </Button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] sm:text-xs overflow-x-auto border border-slate-800 shadow-inner">
              <code>{embedSnippet}</code>
            </pre>
          </div>

          {/* Platform Setup Guides */}
          <div className="border-t border-slate-200/80 pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Platform Setup Instructions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <p className="font-bold text-slate-800 mb-1">WordPress</p>
                <p className="text-[11px] leading-relaxed">
                  Go to <strong>Appearance → Theme File Editor → footer.php</strong> (or use an &quot;Insert Headers &amp; Footers&quot; plugin) and paste right before <code className="text-blue-600">&lt;/body&gt;</code>.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <p className="font-bold text-slate-800 mb-1">Webflow / Squarespace</p>
                <p className="text-[11px] leading-relaxed">
                  Go to <strong>Site Settings → Custom Code → Footer Code</strong> and paste the snippet. Publish changes to live.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <p className="font-bold text-slate-800 mb-1">HTML / React / Next.js</p>
                <p className="text-[11px] leading-relaxed">
                  Place the <code className="text-blue-600">&lt;script&gt;</code> tag inside your root HTML layout before the closing body tag.
                </p>
              </div>
            </div>
          </div>

          {/* Security Features Callout */}
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-950">Isolated &amp; Secure Architecture</p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                The widget runs inside an isolated iframe sandbox. It cannot interfere with your host website styles, scripts, or cookies. Bookings are committed directly through Bookzello&apos;s concurrency-safe engine with strict multi-tenant authorization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
