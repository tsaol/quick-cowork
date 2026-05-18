import fs from 'node:fs';
import path from 'node:path';
import type { FileAttachment } from '@quick-cowork/shared';

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx',
  '.html', '.css', '.scss', '.less', '.xml', '.yaml', '.yml',
  '.toml', '.ini', '.cfg', '.conf', '.env', '.sh', '.bash',
  '.zsh', '.fish', '.py', '.rb', '.go', '.rs', '.java',
  '.kt', '.swift', '.c', '.cpp', '.h', '.hpp', '.cs',
  '.sql', '.graphql', '.prisma', '.csv', '.tsv', '.log',
  '.gitignore', '.dockerignore', '.editorconfig',
]);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg']);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class FileService {
  private allowedFolders: string[] = [];

  setAllowedFolders(folders: string[]): void {
    this.allowedFolders = folders;
  }

  getAllowedFolders(): string[] {
    return [...this.allowedFolders];
  }

  addAllowedFolder(folderPath: string): void {
    if (!this.allowedFolders.includes(folderPath)) {
      this.allowedFolders.push(folderPath);
    }
  }

  removeAllowedFolder(folderPath: string): void {
    this.allowedFolders = this.allowedFolders.filter((f) => f !== folderPath);
  }

  isPathAllowed(filePath: string): boolean {
    const resolved = path.resolve(filePath);
    return this.allowedFolders.some((folder) => resolved.startsWith(path.resolve(folder)));
  }

  async readFile(filePath: string): Promise<FileAttachment | null> {
    if (!this.isPathAllowed(filePath)) {
      return null;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_FILE_SIZE) {
        return null;
      }

      const ext = path.extname(filePath).toLowerCase();
      const name = path.basename(filePath);
      const mimeType = this.getMimeType(ext);

      let content: string;

      if (IMAGE_EXTENSIONS.has(ext)) {
        // Return base64 for images
        const buffer = fs.readFileSync(filePath);
        content = `data:${mimeType};base64,${buffer.toString('base64')}`;
      } else if (TEXT_EXTENSIONS.has(ext) || ext === '') {
        content = fs.readFileSync(filePath, 'utf-8');
      } else {
        // Try reading as text, fall back to base64
        try {
          content = fs.readFileSync(filePath, 'utf-8');
          // Check if content looks like binary
          if (content.includes('\0')) {
            const buffer = fs.readFileSync(filePath);
            content = `[Binary file: ${name}, ${stat.size} bytes]`;
            void buffer; // not used further
          }
        } catch {
          content = `[Unable to read file: ${name}]`;
        }
      }

      return {
        id: crypto.randomUUID(),
        name,
        path: filePath,
        mimeType,
        size: stat.size,
        content,
      };
    } catch {
      return null;
    }
  }

  private getMimeType(ext: string): string {
    const mimeMap: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.tsx': 'text/typescript',
      '.jsx': 'text/javascript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.xml': 'text/xml',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      '.py': 'text/x-python',
      '.rb': 'text/x-ruby',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.java': 'text/x-java',
      '.c': 'text/x-c',
      '.cpp': 'text/x-c++',
      '.h': 'text/x-c',
      '.sql': 'text/x-sql',
      '.csv': 'text/csv',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }
}
