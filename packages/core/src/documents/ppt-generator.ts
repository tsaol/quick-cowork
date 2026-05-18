import PptxGenJS from 'pptxgenjs';
import type { PptDocumentRequest } from '@quick-cowork/shared';

export async function generatePpt(request: PptDocumentRequest): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.title = request.title;
  pptx.author = 'Quick Cowork';

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(request.title, {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.5,
    fontSize: 36,
    bold: true,
    align: 'center',
    color: '363636',
  });

  // Content slides
  for (const slide of request.slides) {
    const s = pptx.addSlide();

    // Slide title
    s.addText(slide.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: '363636',
    });

    // Bullet points
    const bulletText = slide.content.map((text) => ({
      text,
      options: { fontSize: 16, bullet: true as const, breakLine: true as const },
    }));

    if (bulletText.length > 0) {
      s.addText(bulletText, {
        x: 0.5,
        y: 1.3,
        w: 9,
        h: 5,
        color: '4a4a4a',
        valign: 'top',
      });
    }
  }

  const output = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(output as ArrayBuffer);
}
