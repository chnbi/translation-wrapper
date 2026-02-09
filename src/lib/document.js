/**
 * Document Import/Export Utilities
 * Supports DOCX, PPTX, and PDF file processing for translation workflows
 */
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import { xml2js } from 'xml-js';
import * as pdfjsLib from 'pdfjs-dist';
import { LANGUAGES } from '@/lib/constants';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Parse a PDF file and extract text content
 * @param {File} file - The PDF file to parse
 * @returns {Promise<Object>} Parsed content with paragraphs
 */
export async function parsePdfFile(file) {
    return new Promise(async (resolve, reject) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            const entries = [];
            let globalIndex = 0;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                // Group items by Y position to reconstruct lines/paragraphs roughly
                const items = textContent.items;
                // Simple extraction: join items with space, split by large gaps or y-diff
                // For now, let's treat each item as a potential text run, 
                // but PDF.js splits text weirdly.
                // Better strategy: Join all strings, then split by double newline?
                // Or jus dump all text and split by newlines if they exist.

                // Let's try to reconstruct lines based on 'transform[5]' (y position)
                // This is complex. MVP: Extract all non-empty strings.

                let pageText = '';
                let lastY = -1;

                items.forEach(item => {
                    if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 10) {
                        pageText += '\n';
                    } else if (lastY !== -1) {
                        pageText += ' '; // Add space between words on same line
                    }
                    pageText += item.str;
                    lastY = item.transform[5];
                });

                // Split into "paragraphs"
                const paragraphs = pageText.split('\n').filter(line => line.trim().length > 0);

                paragraphs.forEach(text => {
                    if (text.trim()) {
                        entries.push({
                            id: `pdf_${Date.now()}_${globalIndex}`,
                            en: text.trim(),
                            order: globalIndex,
                            context: `Page ${i}`,
                            translations: {}
                        });
                        globalIndex++;
                    }
                });
            }

            resolve({
                type: 'pdf',
                name: file.name.replace('.pdf', ''),
                entries,
                raw: '',
                html: ''
            });

        } catch (error) {
            console.error('[PDF Parser] Error:', error);
            reject(error);
        }
    });
}


/**
 * Parse a DOCX file and extract text content
 * @param {File} file - The DOCX file to parse
 * @returns {Promise<Object>} Parsed content with paragraphs and structure
 */
export async function parseDocxFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;

                // Use mammoth to extract raw text and HTML
                const [textResult, htmlResult] = await Promise.all([
                    mammoth.extractRawText({ arrayBuffer }),
                    mammoth.convertToHtml({ arrayBuffer })
                ]);

                // Split text into paragraphs (non-empty lines)
                const paragraphs = textResult.value
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                // Create entries for each paragraph
                const entries = paragraphs.map((text, index) => ({
                    id: `docx_${Date.now()}_${index}`,
                    en: text,
                    order: index,
                    translations: {}
                }));

                resolve({
                    type: 'docx',
                    name: file.name.replace('.docx', ''),
                    entries,
                    raw: textResult.value,
                    html: htmlResult.value,
                    messages: textResult.messages
                });
            } catch (error) {
                console.error('[DOCX Parser] Error:', error);
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read DOCX file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Export translation data to DOCX file
 * Creates a bilingual document with source and target text
 * @param {Array} rows - Translation rows with source and target text
 * @param {string} filename - Output filename
 * @param {Object} options - Export options (targetLanguage, format)
 */
export async function exportToDocx(rows, filename, options = {}) {
    const {
        targetLanguage = 'my',
        format = 'bilingual', // 'bilingual', 'source-only', 'target-only', 'table'
        title = 'Translation Export',
        includeSource = true
    } = options;

    const langLabel = LANGUAGES[targetLanguage]?.label || targetLanguage;

    // Build document sections
    const sections = [];

    // Title
    sections.push(
        new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 }
        })
    );

    // Subtitle with language info
    sections.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `English → ${langLabel}`,
                    italics: true,
                    color: '666666'
                })
            ],
            spacing: { after: 400 }
        })
    );

    if (format === 'table') {
        // Create table format
        const tableRows = [
            // Header row
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ text: 'English', bold: true })],
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ text: langLabel, bold: true })],
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    })
                ]
            }),
            // Data rows
            ...rows.map(row => {
                const sourceText = row.en || row.source || row.text || '';
                const targetText = row.translations?.[targetLanguage]?.text ||
                    row[targetLanguage] || '';

                return new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({ text: sourceText })]
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: targetText })]
                        })
                    ]
                });
            })
        ];

        sections.push(
            new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            })
        );
    } else {
        // Paragraph format
        rows.forEach((row, index) => {
            const sourceText = row.en || row.source || row.text || '';
            const targetText = row.translations?.[targetLanguage]?.text ||
                row[targetLanguage] || '';

            // Source paragraph (if included)
            if (includeSource && format !== 'target-only') {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `[EN] `,
                                bold: true,
                                color: '2563EB'
                            }),
                            new TextRun({ text: sourceText })
                        ],
                        spacing: { after: 100 }
                    })
                );
            }

            // Target paragraph (if not source-only)
            if (format !== 'source-only' && targetText) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `[${targetLanguage.toUpperCase()}] `,
                                bold: true,
                                color: 'DC2626'
                            }),
                            new TextRun({ text: targetText })
                        ],
                        spacing: { after: 200 }
                    })
                );
            }

            // Separator between entries
            if (index < rows.length - 1) {
                sections.push(
                    new Paragraph({ text: '' })
                );
            }
        });
    }

    // Create and download document
    const doc = new Document({
        sections: [{
            properties: {},
            children: sections
        }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.docx`;
    link.click();
    URL.revokeObjectURL(url);

    console.log(`[DOCX Export] Successfully exported ${rows.length} rows to ${filename}.docx`);
    return true;
}

/**
 * Parse a PPTX file and extract text content from slides
 * @param {File} file - The PPTX file to parse
 * @returns {Promise<Object>} Parsed content
 */
export async function parsePptxFile(file) {
    return new Promise(async (resolve, reject) => {
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(file);

            // Find all slide files
            const slideFiles = Object.keys(content.files)
                .filter(name => name.match(/ppt\/slides\/slide\d+\.xml/))
                .sort((a, b) => {
                    // Sort by slide number: slide1, slide2, slide10
                    const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
                    const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
                    return numA - numB;
                });

            const entries = [];
            let globalIndex = 0;

            for (const slideName of slideFiles) {
                const slideXml = await content.files[slideName].async('text');
                const result = xml2js(slideXml, { compact: true, ignoreComment: true, alwaysChildren: true });

                // Helper to extract text recursively
                const extractText = (node) => {
                    let text = '';
                    if (node._text) text += node._text;
                    if (node['a:t']) { // Text tag in PPTX
                        // Check if it has text content directly or in _text
                        if (typeof node['a:t'] === 'string') text += node['a:t'];
                        else if (node['a:t']._text) text += node['a:t']._text;
                    }

                    // Traverse children
                    Object.keys(node).forEach(key => {
                        if (key === '_attributes' || key === '_text') return;
                        if (Array.isArray(node[key])) {
                            node[key].forEach(child => text += extractText(child) + ' ');
                        } else if (typeof node[key] === 'object') {
                            text += extractText(node[key]) + ' ';
                        }
                    });
                    return text;
                };

                // Traverse specific path for text bodies if possible, or just dump all text
                // Structure: p:sp -> p:txBody -> a:p -> a:r -> a:t
                // Using a simpler recursive finder on the whole XML handling widely varying structures

                // We want to separate text by paragraphs (a:p)
                // Let's find all <a:p> elements manually or via traversal

                // Optimized extraction: Find all <a:p> tags which represent paragraphs
                // This usually requires a proper XML traversal finding specific nodes
                // For MVP, we'll try a regex approach on the XML string for simplicity and valid order?
                // No, regex on XML is fragile. Let's iterate the JS object.

                const slideText = [];
                const findParagraphs = (node) => {
                    if (node['a:p']) { // Found paragraph(s)
                        const pList = Array.isArray(node['a:p']) ? node['a:p'] : [node['a:p']];
                        pList.forEach(p => {
                            // Extract text runs from this paragraph
                            let pText = '';
                            if (p['a:r']) {
                                const rList = Array.isArray(p['a:r']) ? p['a:r'] : [p['a:r']];
                                rList.forEach(r => {
                                    if (r['a:t']) {
                                        pText += (r['a:t']._text || '') + '';
                                    }
                                });
                            }
                            if (pText.trim()) slideText.push(pText.trim());
                        });
                    } else {
                        Object.keys(node).forEach(key => {
                            if (typeof node[key] === 'object' && node[key] !== null) {
                                findParagraphs(node[key]);
                            }
                        });
                    }
                };

                findParagraphs(result);

                slideText.forEach(text => {
                    entries.push({
                        id: `pptx_${Date.now()}_${globalIndex}`,
                        en: text,
                        order: globalIndex,
                        context: `Slide ${slideName.match(/slide(\d+)/)[1]}`,
                        translations: {}
                    });
                    globalIndex++;
                });
            }

            resolve({
                type: 'pptx',
                name: file.name.replace('.pptx', ''),
                entries,
                raw: '', // Not keeping raw XML
                html: ''
            });

        } catch (error) {
            console.error('[PPTX Parser] Error:', error);
            reject(error);
        }
    });
}

/**
 * Export to PPTX
 * @param {Array} rows 
 * @param {string} filename 
 * @param {Object} options 
 */
export async function exportToPptx(rows, filename, options = {}) {
    const { targetLanguage = 'my' } = options;
    const pptx = new PptxGenJS();

    // Group rows by context (Slide X) if possible, otherwise create new slides per X rows
    // Attempt to parse 'Slide X' from context

    let currentSlide = pptx.addSlide();
    let yPos = 0.5;

    // Simple export: List format
    // For a real reconstruction we'd need original layout info which we don't have.
    // So we'll create a "Translation Report" style PPTX.

    pptx.layout = 'LAYOUT_16x9';

    // Title Slide
    currentSlide.addText(filename, { x: 0.5, y: 2, w: '90%', fontSize: 24, bold: true, align: 'center' });
    currentSlide.addText(`Target Language: ${LANGUAGES[targetLanguage]?.label || targetLanguage}`, { x: 0.5, y: 3, w: '90%', fontSize: 18, align: 'center' });

    // Content Slides
    let rowsPerSlide = 6;
    let currentRowCount = 0;

    rows.forEach((row, index) => {
        if (index === 0 || currentRowCount >= rowsPerSlide) {
            currentSlide = pptx.addSlide();
            currentSlide.addText("Translations", { x: 0.5, y: 0.2, fontSize: 14, color: '666666' });
            yPos = 0.8;
            currentRowCount = 0;
        }

        const source = row.en || row.text || '';
        const target = row.translations?.[targetLanguage]?.text || row[targetLanguage] || '';

        // Source Box
        currentSlide.addText(source, {
            x: 0.5, y: yPos, w: 4.5, h: 1,
            fontSize: 12, color: '000000', fill: 'F3F4F6'
        });

        // Target Box
        currentSlide.addText(target, {
            x: 5.2, y: yPos, w: 4.5, h: 1,
            fontSize: 12, color: '000000', fill: 'E5E7EB', bold: !!target
        });

        yPos += 1.1;
        currentRowCount++;
    });

    try {
        await pptx.writeFile({ fileName: `${filename}.pptx` });
        console.log(`[PPTX Export] Exported to ${filename}.pptx`);
    } catch (error) {
        console.error('PPTX Export failed:', error);
        throw error;
    }
}

/**
 * Detect file type from file extension
 * @param {File} file
 * @returns {'xlsx'|'docx'|'pptx'|'pdf'|'csv'|'unknown'}
 */
export function detectFileType(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';
    if (name.endsWith('.docx')) return 'docx';
    if (name.endsWith('.pptx')) return 'pptx';
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.csv')) return 'csv';
    return 'unknown';
}

/**
 * Unified file parser that routes to the appropriate parser
 * @param {File} file
 * @returns {Promise<Object>} Parsed content
 */
export async function parseFile(file) {
    const type = detectFileType(file);

    switch (type) {
        case 'docx':
            return parseDocxFile(file);
        case 'pdf':
            return parsePdfFile(file);
        case 'xlsx':
        case 'xls':
        case 'csv':
            // Delegate to existing Excel parser
            const { parseExcelFile } = await import('@/lib/excel');
            return parseExcelFile(file);
        case 'pptx':
            return parsePptxFile(file);
        default:
            throw new Error(`Unsupported file type: ${file.name}`);
    }
}

