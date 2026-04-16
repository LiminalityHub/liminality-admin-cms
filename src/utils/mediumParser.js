/**
 * Fetch a URL through the local dev-server proxy at /api/fetch-url.
 * The request stays on localhost so browser extensions can't block it,
 * and the server handles the external fetch (no CORS issues).
 */
async function fetchViaProxy(url) {
  const proxyUrl = `/api/fetch-url?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `HTTP ${response.status}`);
  }
  return response.text();
}

/**
 * Extract the RSS feed path from a Medium article URL.
 *
 * Supported URL formats:
 *   https://medium.com/@user/article-slug-abc123
 *   https://user.medium.com/article-slug-abc123
 *   https://medium.com/publication/article-slug-abc123
 */
function extractFeedPath(url) {
  try {
    const u = new URL(url);

    // https://user.medium.com/...
    if (u.hostname !== 'medium.com' && u.hostname.endsWith('.medium.com')) {
      const user = u.hostname.replace('.medium.com', '');
      return `@${user}`;
    }

    // https://medium.com/@user/... or https://medium.com/publication/...
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 1) return parts[0]; // "@user" or "publication"
  } catch {
    // ignore
  }
  return null;
}

/**
 * Extract the article slug (last path segment) from a Medium URL
 * to match against RSS feed items.
 */
function extractSlug(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return '';
  }
}

/**
 * Fetch and parse a Medium article into CMS-ready fields.
 * Uses Medium's RSS feed which bypasses Cloudflare protection.
 * Returns { title, excerpt, content, tags }.
 */
export async function parseMediumArticle(url) {
  const cleanUrl = url.trim();
  if (!cleanUrl) throw new Error('Please enter a URL.');

  const feedPath = extractFeedPath(cleanUrl);
  if (!feedPath) throw new Error('Could not parse this URL. Paste a medium.com article link.');

  const feedUrl = `https://medium.com/feed/${feedPath}`;
  const xml = await fetchViaProxy(feedUrl);

  // Check we got valid XML, not an HTML error page
  if (!xml.trim().startsWith('<?xml') && !xml.trim().startsWith('<rss')) {
    throw new Error('Could not load the RSS feed. Check the URL and try again.');
  }

  // Parse RSS XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  // Find the matching <item> by comparing URL slugs
  const slug = extractSlug(cleanUrl);
  const items = Array.from(doc.querySelectorAll('item'));

  if (items.length === 0) {
    throw new Error('No articles found in this feed. Check the URL.');
  }

  let matched = null;
  for (const item of items) {
    const itemLink = item.querySelector('link')?.textContent || '';
    if (extractSlug(itemLink).startsWith(slug.split('?')[0])) {
      matched = item;
      break;
    }
  }

  // Also try matching by the hex ID at the end of the slug (e.g. "article-title-abc123def")
  if (!matched) {
    const hexId = slug.match(/[a-f0-9]{8,}$/)?.[0];
    if (hexId) {
      for (const item of items) {
        const itemLink = item.querySelector('link')?.textContent || '';
        if (itemLink.includes(hexId)) {
          matched = item;
          break;
        }
      }
    }
  }

  if (!matched) {
    throw new Error(
      'Article not found in the feed. Medium RSS only includes the 10 most recent articles. ' +
      'If this is an older article, it may not be available via RSS.'
    );
  }

  // Extract fields
  const title = matched.querySelector('title')?.textContent || '';

  const tags = Array.from(matched.querySelectorAll('category'))
    .map((el) => el.textContent)
    .filter(Boolean)
    .slice(0, 3);

  // content:encoded has the full HTML
  const contentEncoded =
    matched.getElementsByTagName('content:encoded')[0]?.textContent || '';

  // Clean the HTML for TipTap
  const htmlDoc = new DOMParser().parseFromString(contentEncoded, 'text/html');
  const content = cleanHtml(htmlDoc.body);

  // Build excerpt from first paragraph if not available
  const firstP = htmlDoc.body.querySelector('p');
  const excerpt = firstP ? firstP.textContent.slice(0, 300) : '';

  if (!title && !content) {
    throw new Error('Could not extract article content.');
  }

  return { title, excerpt, content, tags };
}

// ── HTML cleaner (converts RSS HTML to TipTap-compatible markup) ──────

function cleanHtml(root) {
  const parts = [];
  for (const node of root.children) {
    const cleaned = cleanNode(node);
    if (cleaned) parts.push(cleaned);
  }
  return parts.join('');
}

const ALLOWED_BLOCK_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'ul', 'ol', 'hr', 'img',
]);

const ALLOWED_INLINE_TAGS = new Set([
  'strong', 'b', 'em', 'i', 'u', 's', 'code', 'a', 'br',
]);

function cleanNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const tag = node.tagName.toLowerCase();

  // Skip non-content elements
  if (['button', 'nav', 'footer', 'aside', 'style', 'script', 'svg', 'noscript'].includes(tag)) {
    return '';
  }

  // Images
  if (tag === 'img') {
    const src = node.getAttribute('src') || node.getAttribute('data-src') || '';
    if (src && !src.startsWith('data:')) return `<img src="${escapeAttr(src)}">`;
    return '';
  }

  // Figure: extract image + optional caption
  if (tag === 'figure') {
    const img = node.querySelector('img');
    const figcaption = node.querySelector('figcaption');
    let result = '';
    if (img) {
      const src = img.getAttribute('src') || '';
      if (src && !src.startsWith('data:')) result += `<img src="${escapeAttr(src)}">`;
    }
    if (figcaption && figcaption.textContent.trim()) {
      result += `<p><em>${escapeHtml(figcaption.textContent.trim())}</em></p>`;
    }
    return result;
  }

  // Normalize h4-h6 → h3
  if (['h4', 'h5', 'h6'].includes(tag)) {
    const inner = cleanChildren(node);
    return inner ? `<h3>${inner}</h3>` : '';
  }

  // Supported block tags
  if (ALLOWED_BLOCK_TAGS.has(tag)) {
    if (tag === 'hr') return '<hr>';
    const inner = cleanChildren(node);
    if (!inner.trim()) return '';
    if (tag === 'pre') return `<pre><code>${escapeHtml(node.textContent)}</code></pre>`;
    return `<${tag}>${inner}</${tag}>`;
  }

  // List items
  if (tag === 'li') {
    const inner = cleanChildren(node);
    return inner ? `<li><p>${inner}</p></li>` : '';
  }

  // Inline tags
  if (ALLOWED_INLINE_TAGS.has(tag)) {
    if (tag === 'br') return '<br>';
    const inner = cleanChildren(node);
    if (!inner) return '';
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      return `<a href="${escapeAttr(href)}">${inner}</a>`;
    }
    const normalized = tag === 'b' ? 'strong' : tag === 'i' ? 'em' : tag;
    return `<${normalized}>${inner}</${normalized}>`;
  }

  // Unwrap wrappers (div, section, span, etc.)
  return cleanChildren(node);
}

function cleanChildren(node) {
  const parts = [];
  for (const child of node.childNodes) {
    const cleaned = cleanNode(child);
    if (cleaned) parts.push(cleaned);
  }
  return parts.join('');
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
