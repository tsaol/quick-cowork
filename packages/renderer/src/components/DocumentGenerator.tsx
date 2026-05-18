import { useState } from 'react';
import { FileText, Table, Presentation, X, Plus, Trash2 } from 'lucide-react';
import type {
  DocumentType,
  DocumentGenerateRequest,
  WordSection,
  ExcelSheet,
  PptSlide,
} from '../types';

interface DocumentGeneratorProps {
  onClose: () => void;
}

export function DocumentGenerator({ onClose }: DocumentGeneratorProps) {
  const [docType, setDocType] = useState<DocumentType>('word');
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Word state
  const [wordSections, setWordSections] = useState<WordSection[]>([
    { heading: '', paragraphs: [''] },
  ]);

  // Excel state
  const [excelSheets, setExcelSheets] = useState<ExcelSheet[]>([
    { name: 'Sheet1', columns: ['Column 1', 'Column 2'], rows: [['', '']] },
  ]);

  // PPT state
  const [pptSlides, setPptSlides] = useState<PptSlide[]>([
    { title: '', content: [''] },
  ]);

  const handleGenerate = async () => {
    if (!title.trim()) return;
    setGenerating(true);
    setResult(null);

    let request: DocumentGenerateRequest;

    switch (docType) {
      case 'word':
        request = { type: 'word', title, content: wordSections };
        break;
      case 'excel':
        request = { type: 'excel', title, sheets: excelSheets };
        break;
      case 'ppt':
        request = { type: 'ppt', title, slides: pptSlides };
        break;
    }

    const response = await window.quickCowork.documents.generate(request);
    setGenerating(false);

    if (response.success) {
      setResult(`Saved to: ${response.filePath}`);
    } else {
      setResult(`Error: ${response.error}`);
    }
  };

  // Word section helpers
  const addWordSection = () => {
    setWordSections([...wordSections, { heading: '', paragraphs: [''] }]);
  };
  const removeWordSection = (idx: number) => {
    setWordSections(wordSections.filter((_, i) => i !== idx));
  };
  const updateWordSection = (idx: number, field: 'heading' | 'paragraphs', value: string) => {
    const updated = [...wordSections];
    if (field === 'heading') {
      updated[idx] = { ...updated[idx], heading: value };
    } else {
      updated[idx] = { ...updated[idx], paragraphs: value.split('\n') };
    }
    setWordSections(updated);
  };

  // PPT slide helpers
  const addSlide = () => {
    setPptSlides([...pptSlides, { title: '', content: [''] }]);
  };
  const removeSlide = (idx: number) => {
    setPptSlides(pptSlides.filter((_, i) => i !== idx));
  };
  const updateSlide = (idx: number, field: 'title' | 'content', value: string) => {
    const updated = [...pptSlides];
    if (field === 'title') {
      updated[idx] = { ...updated[idx], title: value };
    } else {
      updated[idx] = { ...updated[idx], content: value.split('\n') };
    }
    setPptSlides(updated);
  };

  // Excel helpers
  const addExcelRow = (sheetIdx: number) => {
    const updated = [...excelSheets];
    const emptyRow: (string | number)[] = updated[sheetIdx].columns.map(() => '');
    updated[sheetIdx] = {
      ...updated[sheetIdx],
      rows: [...updated[sheetIdx].rows, emptyRow],
    };
    setExcelSheets(updated);
  };
  const addExcelColumn = (sheetIdx: number) => {
    const updated = [...excelSheets];
    updated[sheetIdx] = {
      ...updated[sheetIdx],
      columns: [...updated[sheetIdx].columns, `Column ${updated[sheetIdx].columns.length + 1}`],
      rows: updated[sheetIdx].rows.map((row: (string | number)[]) => [...row, '']),
    };
    setExcelSheets(updated);
  };
  const updateExcelColumn = (sheetIdx: number, colIdx: number, value: string) => {
    const updated = [...excelSheets];
    const cols = [...updated[sheetIdx].columns];
    cols[colIdx] = value;
    updated[sheetIdx] = { ...updated[sheetIdx], columns: cols };
    setExcelSheets(updated);
  };
  const updateExcelCell = (sheetIdx: number, rowIdx: number, colIdx: number, value: string) => {
    const updated = [...excelSheets];
    const rows = updated[sheetIdx].rows.map((r: (string | number)[]) => [...r]);
    rows[rowIdx][colIdx] = value;
    updated[sheetIdx] = { ...updated[sheetIdx], rows };
    setExcelSheets(updated);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-100">Generate Document</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Document type selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setDocType('word')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              docType === 'word'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <FileText size={16} />
            Word
          </button>
          <button
            onClick={() => setDocType('excel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              docType === 'excel'
                ? 'bg-green-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Table size={16} />
            Excel
          </button>
          <button
            onClick={() => setDocType('ppt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              docType === 'ppt'
                ? 'bg-orange-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Presentation size={16} />
            PowerPoint
          </button>
        </div>

        {/* Title input */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Document Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter document title..."
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Word content editor */}
        {docType === 'word' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-400">Sections</label>
              <button
                onClick={addWordSection}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <Plus size={14} /> Add Section
              </button>
            </div>
            {wordSections.map((section, idx) => (
              <div key={idx} className="p-3 bg-zinc-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={section.heading || ''}
                    onChange={(e) => updateWordSection(idx, 'heading', e.target.value)}
                    placeholder="Section heading (optional)"
                    className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                  {wordSections.length > 1 && (
                    <button
                      onClick={() => removeWordSection(idx)}
                      className="p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <textarea
                  value={section.paragraphs.join('\n')}
                  onChange={(e) => updateWordSection(idx, 'paragraphs', e.target.value)}
                  placeholder="Paragraph content (one per line)"
                  rows={3}
                  className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Excel content editor */}
        {docType === 'excel' && (
          <div className="space-y-3">
            {excelSheets.map((sheet, sheetIdx) => (
              <div key={sheetIdx} className="p-3 bg-zinc-800 rounded-lg space-y-2">
                <input
                  type="text"
                  value={sheet.name}
                  onChange={(e) => {
                    const updated = [...excelSheets];
                    updated[sheetIdx] = { ...updated[sheetIdx], name: e.target.value };
                    setExcelSheets(updated);
                  }}
                  placeholder="Sheet name"
                  className="px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <div className="overflow-x-auto">
                  <table className="text-sm">
                    <thead>
                      <tr>
                        {sheet.columns.map((col: string, colIdx: number) => (
                          <th key={colIdx} className="p-1">
                            <input
                              type="text"
                              value={col}
                              onChange={(e) =>
                                updateExcelColumn(sheetIdx, colIdx, e.target.value)
                              }
                              className="w-28 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
                            />
                          </th>
                        ))}
                        <th className="p-1">
                          <button
                            onClick={() => addExcelColumn(sheetIdx)}
                            className="p-1 text-zinc-500 hover:text-blue-400"
                          >
                            <Plus size={14} />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.rows.map((row: (string | number)[], rowIdx: number) => (
                        <tr key={rowIdx}>
                          {row.map((cell: string | number, colIdx: number) => (
                            <td key={colIdx} className="p-1">
                              <input
                                type="text"
                                value={String(cell)}
                                onChange={(e) =>
                                  updateExcelCell(sheetIdx, rowIdx, colIdx, e.target.value)
                                }
                                className="w-28 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => addExcelRow(sheetIdx)}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>
            ))}
          </div>
        )}

        {/* PPT content editor */}
        {docType === 'ppt' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-400">Slides</label>
              <button
                onClick={addSlide}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <Plus size={14} /> Add Slide
              </button>
            </div>
            {pptSlides.map((slide, idx) => (
              <div key={idx} className="p-3 bg-zinc-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-mono">#{idx + 1}</span>
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                    placeholder="Slide title"
                    className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                  {pptSlides.length > 1 && (
                    <button
                      onClick={() => removeSlide(idx)}
                      className="p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <textarea
                  value={slide.content.join('\n')}
                  onChange={(e) => updateSlide(idx, 'content', e.target.value)}
                  placeholder="Bullet points (one per line)"
                  rows={3}
                  className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Result message */}
        {result && (
          <div
            className={`p-3 rounded-lg text-sm ${
              result.startsWith('Error')
                ? 'bg-red-900/30 text-red-300 border border-red-800'
                : 'bg-green-900/30 text-green-300 border border-green-800'
            }`}
          >
            {result}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-zinc-800">
        <button
          onClick={handleGenerate}
          disabled={!title.trim() || generating}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {generating ? 'Generating...' : 'Generate & Save'}
        </button>
      </div>
    </div>
  );
}
