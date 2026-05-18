import type { WebSearchResponse, WebSearchResult, FetchUrlResponse } from '@quick-cowork/shared';
import * as cheerio from 'cheerio';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Search the web using DuckDuckGo HTML search.
 * Parses the results page to extract titles, URLs, and snippets.
 */
export async function webSearch(query: string, maxResults = 8): Promise<WebSearchResponse> {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results: WebSearchResult[] = [];

  $('.result').each((_i, el) => {
    if (results.length >= maxResults) return false;

    const titleEl = $(el).find('.result__a');
    const snippetEl = $(el).find('.result__snippet');
    const urlEl = $(el).find('.result__url');

    const title = titleEl.text().trim();
    let href = titleEl.attr('href') || '';
    const snippet = snippetEl.text().trim();
    const displayUrl = urlEl.text().trim();

    // DuckDuckGo wraps URLs in a redirect — extract the actual URL
    if (href.includes('uddg=')) {
      const match = href.match(/uddg=([^&]+)/);
      if (match) {
        href = decodeURIComponent(match[1]);
      }
    } else if (displayUrl) {
      href = displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`;
    }

    if (title && href) {
      results.push({ title, url: href, snippet });
    }
  });

  return { query, results };
}

/**
 * Fetch a URL and extract readable content using cheerio.
 */
export async function fetchUrl(url: string): Promise<FetchUrlResponse> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,text/plain',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('text/plain')) {
    return {
      url,
      title: url,
      content: text.slice(0, 10000),
      summary: text.slice(0, 500),
    };
  }

  const $ = cheerio.load(text);

  // Remove non-content elements
  $('script, style, nav, header, footer, iframe, noscript, aside, .ad, .ads, .advertisement').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || url;

  // Extract main content — try common selectors
  let content = '';
  const mainSelectors = ['main', 'article', '[role="main"]', '.content', '.post-content', '#content'];
  for (const sel of mainSelectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 200) {
      content = el.text().trim();
      break;
    }
  }

  if (!content) {
    content = $('body').text().trim();
  }

  // Clean up whitespace
  content = content.replace(/\s+/g, ' ').trim().slice(0, 10000);

  // Summary is the first portion
  const summary = content.slice(0, 500);

  return { url, title, content, summary };
}
