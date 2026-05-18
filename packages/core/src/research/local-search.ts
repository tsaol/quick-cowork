import { glob } from 'glob';
import fs from 'node:fs';
import path from 'node:path';
import type { LocalSearchResult, LocalSearchOptions, FileContentResponse } from '@quick-cowork/shared';

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.ts', '.tsx', '.js', '.jsx', '.html', '.css',
  '.scss', '.yaml', '.yml', '.toml', '.xml', '.csv', '.py', '.rb', '.go',
  '.rs', '.java', '.c', '.cpp', '.h', '.hpp', '.sh', '.bash', '.zsh',
  '.env', '.gitignore', '.dockerfile', '.sql', '.graphql', '.vue', '.svelte',
]);

function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || ext === '';
}

/**
 * Search local files by glob pattern and/or text content.
 */
export async function localSearch(options: LocalSearchOptions): Promise<LocalSearchResult[]> {
  const { directory, pattern, query, maxResults = 50 } = options;

  // Verify directory exists
  if (!fs.existsSync(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }

  const searchPattern = pattern || '**/*';
  const files = await glob(searchPattern, {
    cwd: directory,
    nodir: true,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
    maxDepth: 10,
  });

  const results: LocalSearchResult[] = [];

  for (const filePath of files) {
    if (results.length >= maxResults) break;

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    // Skip large files (>1MB)
    if (stat.size > 1024 * 1024) continue;

    const fileName = path.basename(filePath);

    // If there's a text query, search inside the file
    if (query && isTextFile(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const lowerQuery = query.toLowerCase();

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(lowerQuery)) {
            results.push({
              filePath,
              fileName,
              matchLine: i + 1,
              matchText: lines[i].trim().slice(0, 200),
              size: stat.size,
              modifiedAt: stat.mtimeMs,
            });
            break; // one match per file is enough for the listing
          }
        }
      } catch {
        // skip unreadable files
      }
    } else if (!query) {
      // No text query — just list files matching the pattern
      results.push({
        filePath,
        fileName,
        size: stat.size,
        modifiedAt: stat.mtimeMs,
      });
    }
  }

  return results;
}

/**
 * Read file content (for text files only).
 */
export function readFileContent(filePath: string): FileContentResponse {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (stat.size > 2 * 1024 * 1024) {
    throw new Error('File too large (>2MB)');
  }

  if (!isTextFile(filePath)) {
    throw new Error('Not a text file');
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    filePath,
    content,
    size: stat.size,
  };
}
