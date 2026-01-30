# Image Handling Workflow

## Overview

The Forge POC Orchestrator now includes a flexible, robust image handling system that fetches images from Figma and enriches generated HTML with actual image URLs.

## Architecture

### Components

1. **Image Collection** (`collectImageRefs()`)
   - Recursively traverses the component tree
   - Identifies IMAGE nodes
   - Extracts imageRef property from Figma data
   - Returns Set<string> of unique image refs

2. **Image Fetching** (`fetchImagesFromFigma()`)
   - Calls Figma API `/images/{fileKey}` endpoint
   - Batches all image refs in single API call (efficient)
   - Configurable format (png, jpg, svg, pdf)
   - Configurable scale (1x, 2x, 3x, 4x)
   - Comprehensive error handling
   - Returns Map<imageRef, imageUrl>

3. **Component Enrichment** (`enrichComponentsWithImageUrls()`)
   - Recursively walks component tree
   - Matches imageRef to fetched URL
   - Adds `imageUrl` property to IMAGE components
   - Logs success/failure for each image

4. **HTML Rendering** (`renderComponentTree()`)
   - Detects IMAGE nodes
   - Renders `<img src="...">` tags with URLs
   - Falls back to placeholder if URL missing
   - Preserves layout with width/height/object-fit

## Configuration

### POCRunOptions

```typescript
interface POCRunOptions {
  /** Fetch images from Figma (default: true) */
  fetchImages?: boolean;

  /** Image format (default: 'png') */
  imageFormat?: 'png' | 'jpg' | 'svg' | 'pdf';

  /** Image scale multiplier (default: 2 for retina) */
  imageScale?: number;
}
```

### Usage Example

```typescript
const orchestrator = new ForgePOCOrchestrator(config);

const result = await orchestrator.run({
  figmaUrl: 'https://www.figma.com/file/...',
  options: {
    fetchImages: true,        // Enable image fetching
    imageFormat: 'png',       // PNG format
    imageScale: 2,            // 2x for retina displays
    generateHtml: true,
  }
});
```

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Parse Figma File (getFile API)                          │
│    └─> Extract component tree with IMAGE nodes             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Collect Image Refs (collectImageRefs)                   │
│    └─> Recursive traversal, extract all imageRef props     │
│    └─> Result: Set<"I123:456", "I789:012", ...>            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Fetch Images (fetchImagesFromFigma)                     │
│    └─> Single API call: getImages(fileKey, {ids, format})  │
│    └─> Result: Map<imageRef → CDN URL>                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Enrich Components (enrichComponentsWithImageUrls)       │
│    └─> Walk tree, match imageRef → URL                     │
│    └─> Add imageUrl property to IMAGE components           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Render HTML (renderComponentTree)                       │
│    └─> IMAGE nodes: <img src="{imageUrl}" />               │
│    └─> Fallback: [Image: {name}] placeholder               │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

### Graceful Degradation

The system is designed to handle various failure scenarios gracefully:

| Scenario | Behavior |
|----------|----------|
| No images in design | Skip fetching, log info message |
| Figma API error | Log error, continue with placeholders |
| Some images missing | Render available images, placeholders for missing |
| Network timeout | Catch error, all images show placeholders |
| Invalid imageRef | Log warning, show placeholder |

### Logging

Comprehensive logging at each stage:

```
[parseFigmaComponents] Image fetching enabled, collecting image references...
[parseFigmaComponents] Found 3 images in design
[fetchImagesFromFigma] Fetching 3 images (format=png, scale=2x)...
[fetchImagesFromFigma] Figma API call completed in 847ms
[fetchImagesFromFigma] Successfully fetched 3/3 images
[enrichComponentsWithImageUrls] Added URL for image: Company Logo
[enrichComponentsWithImageUrls] Added URL for image: Hero Image
[enrichComponentsWithImageUrls] No URL found for image: Background Texture (id: I789:012)
[parseFigmaComponents] Successfully enriched 2 images
```

## Flexibility Features

### 1. Configurable Formats

Support for all Figma export formats:
- **PNG**: Best for UI screenshots, logos (default)
- **JPG**: Smaller file size for photos
- **SVG**: Vector graphics, infinitely scalable
- **PDF**: Print-ready, high fidelity

### 2. Configurable Scale

Support for various display densities:
- **1x**: Standard resolution
- **2x**: Retina/HiDPI displays (default)
- **3x**: 4K displays
- **4x**: Ultra-high resolution

### 3. Optional Fetching

Images can be disabled entirely:
```typescript
options: {
  fetchImages: false  // Skip image fetching, use placeholders
}
```

Use cases:
- Faster prototyping (skip image fetch)
- Design review (focus on layout, not images)
- Bandwidth constraints
- Figma API rate limiting

### 4. Batch Efficiency

Single API call fetches ALL images:
- Reduces API calls (1 instead of N)
- Respects Figma rate limits
- Faster overall processing

### 5. Recursive Tree Handling

Works with ANY component structure:
- Flat lists
- Deep nesting (50 levels supported)
- Mixed hierarchies
- Multiple IMAGE nodes at any depth

## Testing

### Unit Tests

Test image handling in isolation:
```typescript
describe('Image Fetching', () => {
  it('collects image refs recursively', () => {
    const imageRefs = orchestrator.collectImageRefs(mockComponents);
    expect(imageRefs.size).toBe(3);
  });

  it('handles missing images gracefully', async () => {
    const imageMap = await orchestrator.fetchImagesFromFigma(
      fileKey,
      new Set(['invalid-ref'])
    );
    expect(imageMap.size).toBe(0); // No error thrown
  });
});
```

### Integration Tests

Test end-to-end with real Figma file:
```typescript
it('fetches and renders images from Figma', async () => {
  const result = await orchestrator.run({
    figmaUrl: FIGMA_URL_WITH_IMAGES,
    options: { fetchImages: true, generateHtml: true }
  });

  const html = fs.readFileSync(result.files.html.design);
  expect(html).toContain('<img src="https://');
  expect(html).toContain('object-fit: cover');
});
```

## Performance

### Metrics (Sample Figma File)

| Metric | Value |
|--------|-------|
| Image collection | <10ms (recursive traversal) |
| API call | ~500-1000ms (network latency) |
| Component enrichment | <50ms (recursive walk) |
| Total overhead | ~1 second |

### Optimization

- Batching: 1 API call for N images (not N calls)
- Caching: Future enhancement - cache URLs by imageRef
- Lazy loading: Future enhancement - fetch images on-demand

## Future Enhancements

### Planned Features

1. **URL Caching**
   - Cache imageRef → URL mappings
   - Avoid repeated API calls for same images
   - TTL-based expiration

2. **Progress Reporting**
   - Emit progress events during image fetch
   - Show image count in UI

3. **Parallel Fetching**
   - Fetch large image sets in batches
   - Respect rate limits

4. **Image Optimization**
   - Automatic format selection based on content
   - WebP support for modern browsers
   - Responsive image srcset generation

5. **Error Recovery**
   - Retry failed image fetches
   - Exponential backoff
   - Circuit breaker pattern

## Troubleshooting

### Images Not Showing

**Symptom**: Placeholders instead of images

**Possible Causes**:
1. `fetchImages: false` in options
2. Figma API token invalid
3. Network error during fetch
4. Image refs not found in Figma file

**Debug Steps**:
```bash
# Check logs for image fetching
grep "fetchImagesFromFigma" logs.txt

# Verify Figma token
curl -H "X-Figma-Token: $TOKEN" https://api.figma.com/v1/me

# Test getImages endpoint directly
curl -H "X-Figma-Token: $TOKEN" \
  "https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=png&scale=2"
```

### Performance Issues

**Symptom**: Slow image fetching (>5 seconds)

**Possible Causes**:
1. Large number of images (>50)
2. High scale factor (4x)
3. Network latency
4. Figma API rate limiting

**Solutions**:
- Reduce scale to 2x or 1x
- Use JPG instead of PNG for photos
- Enable caching (future)
- Split large designs into smaller files

## Security

### Figma Token Handling

- Token passed via environment variable
- Never logged or exposed in error messages
- Scoped to read-only file access

### Image URLs

- URLs returned by Figma are temporary CDN links
- Valid for 14 days (Figma policy)
- HTTPS only
- No authentication required after fetch

## Compliance

### GDPR/Privacy

- No user data in image URLs
- No tracking or analytics
- Temporary CDN links auto-expire

### Rate Limiting

- Figma API: 100 requests/minute (typical)
- Batch fetching reduces request count
- Exponential backoff on 429 errors (future)

---

**Last Updated**: 2026-01-29
**Version**: 1.0
**Author**: Forge POC Team
