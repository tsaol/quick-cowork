import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
} from 'docx';
import type { WordDocumentRequest } from '@quick-cowork/shared';

export async function generateWord(request: WordDocumentRequest): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: request.title, bold: true, size: 48 })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    }),
  );

  // Sections
  for (const section of request.content) {
    if (section.heading) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.heading, bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }),
      );
    }

    for (const text of section.paragraphs) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text, size: 24 })],
          spacing: { after: 120 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
