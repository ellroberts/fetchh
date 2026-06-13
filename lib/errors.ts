export function friendlyErrorMessage(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes('failed to fetch') || s.includes('networkerror') || s.includes('network request failed'))
    return 'Unable to load your threads. Please check your connection and try again.'
  if (s.includes('jwt expired') || s.includes('invalid jwt') || s.includes('not authenticated'))
    return 'Your session has expired. Please refresh the page to log back in.'
  if (s.includes('permission denied') || s.includes('row-level security'))
    return "You don't have permission to view this content."
  if (s.includes('too many requests') || s.includes('rate limit'))
    return 'Too many requests. Please wait a moment and try again.'
  return 'Something went wrong. Please refresh the page or try again.'
}
