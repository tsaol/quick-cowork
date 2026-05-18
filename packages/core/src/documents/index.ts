import type { DocumentGenerateRequest } from '@quick-cowork/shared';
import { generateWord } from './word-generator.js';
import { generateExcel } from './excel-generator.js';
import { generatePpt } from './ppt-generator.js';

export { generateWord } from './word-generator.js';
export { generateExcel } from './excel-generator.js';
export { generatePpt } from './ppt-generator.js';

export async function generateDocument(request: DocumentGenerateRequest): Promise<Buffer> {
  switch (request.type) {
    case 'word':
      return generateWord(request);
    case 'excel':
      return generateExcel(request);
    case 'ppt':
      return generatePpt(request);
    default:
      throw new Error(`Unknown document type: ${(request as { type: string }).type}`);
  }
}

export function getFileExtension(type: DocumentGenerateRequest['type']): string {
  switch (type) {
    case 'word':
      return 'docx';
    case 'excel':
      return 'xlsx';
    case 'ppt':
      return 'pptx';
  }
}

export function getFileFilter(type: DocumentGenerateRequest['type']): { name: string; extensions: string[] } {
  switch (type) {
    case 'word':
      return { name: 'Word Document', extensions: ['docx'] };
    case 'excel':
      return { name: 'Excel Spreadsheet', extensions: ['xlsx'] };
    case 'ppt':
      return { name: 'PowerPoint Presentation', extensions: ['pptx'] };
  }
}
