import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  HeightRule,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'

export const COLORS = {
  primary: '0F172A', // Dark Navy
  secondary: '1E3A8A', // Deep Blue
  accent: '0284C7', // Sky Blue
  emerald: '059669', // Emerald Green
  crimson: 'DC2626', // Red
  text: '1E293B', // Slate 800
  muted: '64748B', // Slate 500
  bgLight: 'F8FAFC', // Slate 50
  bgCallout: 'F0F9FF', // Sky 50
  border: 'CBD5E1', // Slate 300
}

export function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    run: {
      color: COLORS.secondary,
      bold: true,
      size: 32, // 16pt
      font: 'Calibri',
    },
  })
}

export function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    run: {
      color: COLORS.primary,
      bold: true,
      size: 26, // 13pt
      font: 'Calibri',
    },
  })
}

export function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    run: {
      color: COLORS.accent,
      bold: true,
      size: 22, // 11pt
      font: 'Calibri',
    },
  })
}

export function p(text, options = {}) {
  const runs = []
  if (typeof text === 'string') {
    runs.push(
      new TextRun({
        text,
        size: options.size || 22, // 11pt
        font: 'Calibri',
        color: options.color || COLORS.text,
        bold: Boolean(options.bold),
        italics: Boolean(options.italics),
      })
    )
  } else if (Array.isArray(text)) {
    text.forEach((item) => {
      if (typeof item === 'string') {
        runs.push(new TextRun({ text: item, size: 22, font: 'Calibri', color: COLORS.text }))
      } else {
        runs.push(
          new TextRun({
            text: item.text,
            size: item.size || 22,
            font: item.code ? 'Consolas' : 'Calibri',
            color: item.code ? '0369A1' : item.color || COLORS.text,
            bold: Boolean(item.bold),
            italics: Boolean(item.italics),
          })
        )
      }
    })
  }

  return new Paragraph({
    children: runs,
    spacing: { before: options.before || 60, after: options.after || 120 },
    alignment: options.alignment || AlignmentType.LEFT,
  })
}

export function bullet(text, level = 0) {
  const children = []
  if (typeof text === 'string') {
    children.push(new TextRun({ text, size: 22, font: 'Calibri', color: COLORS.text }))
  } else if (Array.isArray(text)) {
    text.forEach((item) => {
      if (typeof item === 'string') {
        children.push(new TextRun({ text: item, size: 22, font: 'Calibri', color: COLORS.text }))
      } else {
        children.push(
          new TextRun({
            text: item.text,
            size: item.size || 22,
            font: item.code ? 'Consolas' : 'Calibri',
            color: item.code ? '0369A1' : item.color || COLORS.text,
            bold: Boolean(item.bold),
            italics: Boolean(item.italics),
          })
        )
      }
    })
  }

  return new Paragraph({
    children,
    bullet: { level },
    spacing: { before: 40, after: 60 },
  })
}

export function callout(title, body) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.accent },
      top: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLORS.bgCallout },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title ? `NOTE: ${title}\n` : '',
                    bold: true,
                    size: 22,
                    color: COLORS.secondary,
                    font: 'Calibri',
                  }),
                  new TextRun({
                    text: body,
                    size: 20,
                    color: COLORS.text,
                    font: 'Calibri',
                  }),
                ],
                spacing: { before: 40, after: 40 },
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

export function codeBlock(codeString) {
  const lines = codeString.split('\n')
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
      right: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: '0F172A' }, // Dark code block
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: lines.map(
              (line) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line || ' ',
                      font: 'Consolas',
                      size: 18, // 9pt
                      color: 'E2E8F0', // Light code font
                    }),
                  ],
                  spacing: { before: 10, after: 10 },
                })
            ),
          }),
        ],
      }),
    ],
  })
}

export function createTable(headers, rows, colWidths = []) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => {
      const cellOpts = {
        shading: { type: ShadingType.CLEAR, fill: COLORS.secondary },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: h,
                bold: true,
                color: 'FFFFFF',
                size: 20,
                font: 'Calibri',
              }),
            ],
            alignment: AlignmentType.LEFT,
          }),
        ],
      }
      if (colWidths[i]) {
        cellOpts.width = { size: colWidths[i], type: WidthType.PERCENTAGE }
      }
      return new TableCell(cellOpts)
    }),
  })

  const bodyRows = rows.map((r, rowIdx) => {
    const isEven = rowIdx % 2 === 0
    return new TableRow({
      children: r.map((cellText, colIdx) => {
        const cellOpts = {
          shading: {
            type: ShadingType.CLEAR,
            fill: isEven ? 'FFFFFF' : COLORS.bgLight,
          },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: String(cellText || ''),
                  color: COLORS.text,
                  size: 20,
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        }
        if (colWidths[colIdx]) {
          cellOpts.width = { size: colWidths[colIdx], type: WidthType.PERCENTAGE }
        }
        return new TableCell(cellOpts)
      }),
    })
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
      right: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
    },
    rows: [headerRow, ...bodyRows],
  })
}
