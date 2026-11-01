import React from "react";
import Link from "next/link";
import { Shield, Calendar, ArrowLeft, ExternalLink, AlertCircle } from "lucide-react";

export interface TocItem {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  title: string;
  badge: string;
  effectiveDate: string;
  lastUpdated?: string;
  summary: React.ReactNode;
  tableOfContents: TocItem[];
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function LegalPageLayout({
  title,
  badge,
  effectiveDate,
  lastUpdated,
  summary,
  tableOfContents,
  children,
  breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Legal & Trust", href: "#" },
  ],
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 pt-8 sm:pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-[#1852E8] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
          <span>/</span>
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {b.href && b.href !== "#" ? (
                <Link href={b.href} className="hover:text-[#1852E8] transition-colors">
                  {b.label}
                </Link>
              ) : (
                <span className="text-slate-400">{b.label}</span>
              )}
              {idx < breadcrumbs.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
          <span>/</span>
          <span className="font-semibold text-slate-800 truncate">{title}</span>
        </nav>

        {/* Hero Header */}
        <header className="mb-10 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1852E8] border border-blue-100">
              <Shield className="h-3.5 w-3.5" />
              {badge}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <Calendar className="h-3.5 w-3.5" />
              Effective Date: {effectiveDate}
            </span>
            {lastUpdated && (
              <span className="text-xs text-slate-400">
                Last reviewed: {lastUpdated}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-[#040F28] sm:text-4xl lg:text-5xl font-brand">
            {title}
          </h1>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-6 text-sm text-slate-700 leading-relaxed">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#1852E8] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-[#040F28]">Document Summary &amp; Legal Context</p>
                <div className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                  {summary}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Grid: Sticky Sidebar TOC + Article Content */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Table of Contents — Sticky Sidebar on Desktop */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4 pb-2 border-b border-slate-100">
                Table of Contents
              </h2>
              <nav className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1 text-xs space-y-1">
                {tableOfContents.map((item, idx) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-[#1852E8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1852E8]"
                  >
                    <span className="font-semibold text-slate-400 mr-1.5">{idx + 1}.</span>
                    {item.title}
                  </a>
                ))}
              </nav>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                <p className="font-semibold text-slate-800">Quick Navigation</p>
                <ul className="space-y-1">
                  <li>
                    <Link href="/privacy" className="hover:text-[#1852E8] flex items-center gap-1 transition-colors">
                      Privacy Policy <ExternalLink className="h-3 w-3" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-[#1852E8] flex items-center gap-1 transition-colors">
                      Terms and Conditions <ExternalLink className="h-3 w-3" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/data-deletion" className="hover:text-[#1852E8] flex items-center gap-1 transition-colors">
                      Data Deletion Instructions <ExternalLink className="h-3 w-3" />
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Article Body */}
          <article className="lg:col-span-8 xl:col-span-9 space-y-10 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-10 text-slate-700 leading-relaxed">
            {children}
          </article>
        </div>
      </div>
    </div>
  );
}
