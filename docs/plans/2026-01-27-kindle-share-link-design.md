# Kindle Share Link Integration

Add books to library by sharing from Kindle app or pasting a Kindle share link.

## Overview

Users can share a book from the Kindle app or paste a copied share link. The app parses the share text, enriches with metadata from APIs, adds the book to the library, and auto-generates a companion.

## Entry Points

### OS Share Sheet (Primary)

Register app to handle `https://read.amazon.co.uk` and `https://read.amazon.com` URLs. When user shares from Kindle, app opens and receives the full share text.

### Paste Button (Fallback)

Add "Paste Kindle Link" button to Library screen alongside existing add-book options. Reads from clipboard and processes the same way.

## Share Text Format

```
I think you might like this book – "[TITLE]" by [AUTHORS].
Start reading it for free: https://read.amazon.../asin=[ASIN]...
```

### Parser Extracts

- **Title**: Text between first `"` and `"`
- **Authors**: Text between `" by ` and `.` (split by `,` for multiple)
- **ASIN**: Value of `asin=` query parameter from URL

If parsing fails, fall back to manual entry screen with extracted data pre-filled.

## Metadata Enrichment

### Google Books API (Primary)

Search strategies in order:
1. Search by ISBN if ASIN starts with `978`/`979`
2. Search by title + author: `intitle:"Title" inauthor:"Author"`
3. Search by title only as last resort

Data to fetch:
- Cover image URL
- Page count
- Description/synopsis
- Categories/genres
- Publisher
- Published date

### OpenLibrary API (Fallback)

If Google Books returns no results or missing key fields:
- Search: `https://openlibrary.org/search.json?title=X&author=Y`
- Covers: `https://covers.openlibrary.org/b/isbn/[ISBN]-L.jpg`

### Graceful Degradation

If both APIs fail:
- Book added with parsed title/author from share text
- Cover shows placeholder image
- Page count, description left empty
- Book detail screen shows "Sync Metadata" button to retry

## Duplicate Handling

Check for existing book by:
1. Matching ASIN (exact match)
2. Matching title + author (fuzzy match)

If duplicate found, show dialog:
- "This book is already in your library"
- **"View existing"** - Navigate to existing book's detail screen
- **"Add anyway"** - Create duplicate entry

## Book Record

```typescript
{
  id: generateUniqueId(),
  title: string,
  authors: string[],
  asin: string,
  coverUrl: string | null,
  pageCount: number | null,
  description: string | null,
  genres: string[],
  status: 'to-read',
  source: 'kindle-share',
  dateAdded: Date,
  metadataSynced: boolean,
}
```

## Companion Generation

### Trigger

Starts automatically when landing on book detail screen after add. If OpenRouter API key not configured, skip and show "Set up API key to generate companions" prompt.

### Progress Steps UI

Display in companion section of book detail screen:

1. "Analyzing book..." - Preparing prompt with book metadata
2. "Creating personality..." - LLM generating companion traits, backstory
3. "Generating avatar..." - Creating/fetching companion image
4. "Done!" - Companion card appears

Each step shows checkmark when complete, spinner on current step.

### Error Handling

If generation fails:
- Show error message: "Couldn't generate companion"
- Display "Try Again" button
- Book remains in library without companion

### Retry Later

Book detail screen shows "Generate Companion" button if:
- Companion doesn't exist AND
- Previous generation failed OR was skipped

## Library Screen UI

### Paste Button Behavior

1. Read clipboard contents
2. Validate it looks like Kindle share (contains `read.amazon` or pattern)
3. If invalid: toast "No Kindle link found in clipboard"
4. If valid: parse → enrich → add → navigate to detail screen

### Visual Feedback

After valid paste, show loading overlay:
- "Adding book..."
- Book title displayed
- Spinner

Then transition to book detail screen.

## Deep Link Configuration

### Expo Configuration

```json
{
  "expo": {
    "scheme": "blahread",
    "android": {
      "intentFilters": [{
        "action": "SEND",
        "category": ["DEFAULT"],
        "data": { "mimeType": "text/plain" }
      }]
    }
  }
}
```

### Handling Incoming Shares

Use Expo's `Linking` API:
- Listen for incoming intents/URLs on app launch and while running
- Extract shared text content
- Route to Kindle link parser

### iOS Share Extension

May need Share Extension for iOS share sheet support. Consider as enhancement after MVP.

## Complete Flow

```
User shares from Kindle OR pastes link in Library
            ↓
    Parse share text (title, authors, ASIN)
            ↓
    Check for duplicates
            ↓ (duplicate found)
    "View existing" or "Add anyway"?
            ↓ (new or add anyway)
    Fetch metadata (Google Books → OpenLibrary → graceful fail)
            ↓
    Create book record
            ↓
    Navigate to book detail screen
            ↓
    Auto-generate companion (if API key configured)
        → "Analyzing book..."
        → "Creating personality..."
        → "Generating avatar..."
        → Companion appears
            ↓
    Done!
```

## Manual Retry Points

- Book detail screen: "Sync Metadata" button (if enrichment failed)
- Book detail screen: "Generate Companion" button (if generation failed/skipped)

## Files to Create/Modify

- `lib/kindleParser.ts` - Parse share text
- `lib/bookEnrichment.ts` - Google Books + OpenLibrary API calls
- `app.json` - Deep link configuration
- `app/_layout.tsx` - Handle incoming share intents
- `app/library.tsx` - Add paste button
- `app/book/[id].tsx` - Companion generation progress UI
