/**
 * Bookzello — Widget Domain Policy & Host Validation
 * Enforces strict multi-tenant domain authorization for embedded booking widgets.
 * Supports exact hostname matching and subdomain hierarchy (*.domain.com).
 */

export const INTERNAL_ALLOWED_HOSTS = [
  "bookzello.com",
  "www.bookzello.com",
  "localhost",
  "127.0.0.1",
];

/**
 * Normalizes a raw domain or URL string into a clean hostname.
 * Strips protocol, port, path, query, and trailing slashes.
 */
export function normalizeHostname(input: string): string {
  if (!input || typeof input !== "string") return "";
  let clean = input.trim().toLowerCase();
  // Strip protocol
  clean = clean.replace(/^[a-z]+:\/\//i, "");
  // Strip paths & query params
  clean = clean.replace(/[/?#].*$/, "");
  // Strip port
  clean = clean.split(":")[0]?.trim() || "";
  return clean;
}

/**
 * Parses a comma- or space-separated list of allowed domains.
 */
export function parseAllowedDomains(rawInput: string | null | undefined): string[] {
  if (!rawInput || typeof rawInput !== "string") return [];
  return rawInput
    .split(/[,\s]+/)
    .map(normalizeHostname)
    .filter((d) => d.length > 0);
}

/**
 * Validates whether a domain string is syntactically a valid domain/hostname.
 */
export function isValidDomainFormat(domain: string): boolean {
  if (!domain) return false;
  if (domain === "localhost") return true;
  // Standard RFC domain format with TLD of at least 2 chars
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Checks whether an incoming candidate (origin, referer, or host) is permitted
 * by the salon's configured allowed domains.
 * 
 * Rules:
 * 1. Empty/missing candidate is allowed (for direct browser test navigation).
 * 2. Internal Bookzello hosts (bookzello.com, localhost) are always allowed.
 * 3. Exact host match: candidate === allowed.
 * 4. Subdomain match: candidate ends with .allowed (e.g. www.ferienkalendr.de matches ferienkalendr.de).
 * 5. Prefix attacks blocked: fake-ferienkalendr.de does NOT match ferienkalendr.de.
 */
export function isDomainAllowed(
  candidate: string | null | undefined,
  allowedDomains: string[]
): boolean {
  if (!candidate || candidate.trim() === "") return true;

  const candidateHost = normalizeHostname(candidate);
  if (!candidateHost) return true;

  // Always allow internal Bookzello & local development hosts
  if (INTERNAL_ALLOWED_HOSTS.includes(candidateHost)) {
    return true;
  }

  const normalizedAllowed = allowedDomains.map(normalizeHostname).filter(Boolean);
  if (normalizedAllowed.length === 0) {
    // If no specific external domains are configured, only internal hosts are permitted
    return false;
  }

  for (const allowed of normalizedAllowed) {
    // Exact match
    if (candidateHost === allowed) {
      return true;
    }
    // Subdomain match (e.g., www.ferienkalendr.de matches ferienkalendr.de)
    if (candidateHost.endsWith(`.${allowed}`)) {
      return true;
    }
  }

  return false;
}
