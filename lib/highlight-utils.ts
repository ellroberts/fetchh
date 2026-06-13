// lib/highlight-utils.ts

export interface SavedHighlight {
  id: string
  msgIndex: number
  text: string        // primary anchor — used for fallback matching
  startOffset: number // char offset into visible text at time of selection
  endOffset: number   // char offset into visible text at time of selection
}

// ── Text-node walker ──────────────────────────────────────────────────────────
// Builds a flat map of { node, start, end } over a DOM element's text nodes.
// Used at selection time to compute offsets from a live Range.

interface TextNodeEntry {
  node: Text
  start: number
  end: number
}

export function collectTextNodes(el: Element): TextNodeEntry[] {
  const entries: TextNodeEntry[] = []
  let offset = 0
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      entries.push({ node: node as Text, start: offset, end: offset + text.length })
      offset += text.length
    } else {
      for (const child of Array.from(node.childNodes)) walk(child)
    }
  }
  walk(el)
  return entries
}

// ── Offset computation from a live DOM Range ──────────────────────────────────
// Uses a TreeWalker to visit text nodes in document order — the same order
// the HTML string walker uses in injectHighlightMarks — so offsets are
// guaranteed to be consistent between capture and re-application.

export function computeOffsetsFromRange(
  range: Range,
  container: Element,
): { startOffset: number; endOffset: number } | null {
  try {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
    )

    let currentOffset = 0
    let startOffset: number | null = null
    let endOffset: number | null = null

    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      const length = node.textContent?.length ?? 0

      if (node === range.startContainer) {
        startOffset = currentOffset + range.startOffset
      }
      if (node === range.endContainer) {
        endOffset = currentOffset + range.endOffset
        break
      }

      currentOffset += length
    }

    if (startOffset === null || endOffset === null) return null

    console.log({
      selectedText: range.toString(),
      startOffset,
      endOffset,
      length: endOffset - startOffset,
    })

    return { startOffset, endOffset }
  } catch {
    return null
  }
}

// ── Fallback text search ──────────────────────────────────────────────────────
// Finds the occurrence of searchText in fullText closest to hintOffset.
// Used when stored offsets have drifted (e.g. message was edited).

export function findOffsetsByText(
  fullText: string,
  searchText: string,
  hintOffset: number,
): { startOffset: number; endOffset: number } | null {
  if (!searchText || searchText.length < 2) return null
  const matches: { startOffset: number; endOffset: number }[] = []
  let idx = 0
  while (idx < fullText.length) {
    const found = fullText.indexOf(searchText, idx)
    if (found === -1) break
    matches.push({ startOffset: found, endOffset: found + searchText.length })
    idx = found + 1
  }
  if (matches.length === 0) return null
  return matches.reduce((prev, curr) =>
    Math.abs((curr.startOffset + curr.endOffset) / 2 - hintOffset) <
    Math.abs((prev.startOffset + prev.endOffset) / 2 - hintOffset) ? curr : prev
  )
}

// ── HTML string highlighter ───────────────────────────────────────────────────
// Takes the rendered markdown HTML string and a list of highlights for this
// message. Returns a new HTML string with <mark> tags injected.
//
// Strategy:
//   1. Strip all HTML tags to get the visible text and a char→htmlIndex map.
//   2. For each highlight, resolve start/end offsets (with text-match fallback).
//   3. Inject <mark> open/close at the corresponding positions in the HTML string.
//   4. Multiple highlights are applied in reverse order so earlier injections
//      don't shift the indices of later ones.

export function injectHighlightMarks(
  html: string,
  highlights: SavedHighlight[],
): string {
  if (!highlights.length) return html

  // Build a map from visible-text char index → position in the raw HTML string.
  // We skip over HTML tags (< ... >) and HTML entities (& ... ;).
  const charToHtml: number[] = []  // charToHtml[i] = index in html of the i-th visible char
  let i = 0
  while (i < html.length) {
    if (html[i] === '<') {
      // skip tag
      while (i < html.length && html[i] !== '>') i++
      i++ // skip '>'
    } else if (html[i] === '&') {
      // Record the position of the entity start for the single visible char
      charToHtml.push(i)
      while (i < html.length && html[i] !== ';') i++
      i++ // skip ';'
    } else {
      charToHtml.push(i)
      i++
    }
  }

  const visibleText = charToHtml.map(pos => html[pos] === '&'
    ? decodeHtmlEntity(html, pos)
    : html[pos]
  ).join('')

  // Resolve each highlight to { start, end } in visible-text space
  type Resolved = { id: string; start: number; end: number }
  const resolved: Resolved[] = []

  for (const h of highlights) {
    let start = h.startOffset
    let end = h.endOffset

    // Verify the text at those offsets matches
    const atOffset = visibleText.slice(start, end).trim()
    if (atOffset !== h.text.trim()) {
      // Fall back to text search
      const hintMid = (h.startOffset + h.endOffset) / 2
      const found = findOffsetsByText(visibleText, h.text.trim(), hintMid)
      if (!found) continue
      start = found.startOffset
      end = found.endOffset    }

    if (start >= end || end > charToHtml.length) continue
    resolved.push({ id: h.id, start, end })
  }

  if (!resolved.length) return html

  // Sort by start offset, then process in reverse so index positions stay valid
  resolved.sort((a, b) => a.start - b.start)

  // Convert visible-text offsets to HTML string positions, then inject marks.
  // We build a list of insertions and apply them all at once in reverse order.
  type Insertion = { htmlPos: number; text: string }
  const insertions: Insertion[] = []

  for (const r of resolved) {
    const htmlStart = charToHtml[r.start]
    // end offset points one past the last char; map to the position after that char in html
    const lastCharHtmlPos = charToHtml[r.end - 1]
    const htmlEnd = advancePastChar(html, lastCharHtmlPos)
    if (htmlStart == null || htmlEnd == null) continue
    insertions.push({ htmlPos: htmlStart, text: `<mark class="threadcub-highlight" data-highlight-id="${r.id}">` })
    insertions.push({ htmlPos: htmlEnd,   text: '</mark>' })
  }

  // Apply insertions in reverse order (highest position first)
  insertions.sort((a, b) => b.htmlPos - a.htmlPos)
  let result = html
  for (const ins of insertions) {
    result = result.slice(0, ins.htmlPos) + ins.text + result.slice(ins.htmlPos)
  }

  return result
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Returns the HTML index immediately after the character starting at pos.
// Handles multi-char HTML entities like &amp; &lt; etc.
function advancePastChar(html: string, pos: number): number {
  if (html[pos] === '&') {
    let j = pos
    while (j < html.length && html[j] !== ';') j++
    return j + 1
  }
  return pos + 1
}

// Minimal HTML entity decoder for single-char entities — enough for
// visible text reconstruction. Full decoding not needed here.
function decodeHtmlEntity(html: string, pos: number): string {
  let j = pos + 1
  let name = ''
  while (j < html.length && html[j] !== ';') { name += html[j]; j++ }
  switch (name) {
    case 'amp':  return '&'
    case 'lt':   return '<'
    case 'gt':   return '>'
    case 'quot': return '"'
    case 'apos': return "'"
    case 'nbsp': return '\u00a0'
    default:     return '&'
  }
}