/** Only same-origin relative paths are allowed as a post-auth destination. */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  return raw
}
