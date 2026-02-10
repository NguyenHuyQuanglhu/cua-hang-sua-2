import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
} from 'docx';
import * as fs from 'fs';

// Tao bao cao cong viec tuan
async function generateReport() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Tieu de
          new Paragraph({
            children: [
              new TextRun({
                text: 'BAO CAO CONG VIEC TUAN',
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Thong tin ca nhan
          new Paragraph({
            children: [
              new TextRun({ text: 'Ho va ten: ', bold: true }),
              new TextRun({ text: '............................................................' }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Vi tri thuc tap: ', bold: true }),
              new TextRun({ text: '....................................................' }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Thoi gian: ', bold: true }),
              new TextRun({ text: 'Tu ngay .../... den ngay .../...' }),
            ],
            spacing: { after: 400 },
          }),

          // Phan I
          new Paragraph({
            children: [
              new TextRun({ text: 'I. Tong ket cong viec trong tuan', bold: true, size: 26 }),
            ],
            spacing: { after: 200 },
          }),

          // Bang cong viec
          createWorkTable(),

          // Phan II
          new Paragraph({
            children: [
              new TextRun({ text: 'II. Cac van de va kho khan gap phai', bold: true, size: 26 }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '- Schema database khong co documentation, phai tim hieu qua code routes/repositories' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '- Foreign key constraints khi xoa du lieu can xu ly dung thu tu' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '- Mapping du lieu giua backend (snake_case) va frontend (camelCase) khong nhat quan' })],
            spacing: { after: 200 },
          }),

          // Phan III
          new Paragraph({
            children: [
              new TextRun({ text: 'III. De xuat & Kien nghi (Neu co)', bold: true, size: 26 }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '- Tao file migration/schema documentation cho database' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '- Thong nhat naming convention giua backend va frontend' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '- Them validation va error handling chi tiet hon' })],
            spacing: { after: 200 },
          }),

          // Phan IV
          new Paragraph({
            children: [
              new TextRun({ text: 'IV. Ke hoach tuan tiep theo', bold: true, size: 26 }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '1. Hoan thien trang bao cao loi nhuan (profit report)' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '2. Kiem tra va sua cac trang bao cao khac' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '3. Toi uu hieu suat truy van database' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '4. Trien khai them tinh nang cho website ban hang online' })],
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });

  // Luu file
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('BaoCaoCongViecTuan.docx', buffer);
  console.log('Da tao file: BaoCaoCongViecTuan.docx');
}

function createWorkTable(): Table {
  const tasks = [
    { stt: '1', task: 'Xoa cua hang mac dinh va xu ly foreign key constraints', status: '100%', result: 'Hoan thanh script xoa du lieu voi dung thu tu FK' },
    { stt: '2', task: 'Dong bo du lieu Backend - Frontend', status: '100%', result: 'Tao API sync stores, tu dong gan user vao stores' },
    { stt: '3', task: 'Tao san pham cho 3 cua hang (Kamen Rider, Pokemon, Yugioh)', status: '100%', result: '45 san pham voi day du gia nhap, gia ban, ton kho, hinh anh' },
    { stt: '4', task: 'Cau hinh Next.js cho external images', status: '100%', result: 'Cho phep load anh tu Pokemon TCG, YGO Prodeck, Wikia' },
    { stt: '5', task: 'Sua loi frontend hien thi NaN cho gia san pham', status: '100%', result: 'Mapping dung costPrice, price, stockQuantity tu API' },
    { stt: '6', task: 'Sua loi cash-flow page (transactions.forEach)', status: '100%', result: 'Them kiem tra Array.isArray()' },
    { stt: '7', task: 'Tao du lieu phieu thu chi mau', status: '100%', result: '5 phieu (3 chi, 2 thu) - Tong thu: 5.5tr, chi: 2.5tr' },
    { stt: '8', task: 'Tao du lieu don hang ban hang mau', status: '100%', result: '5 don hang - Tong doanh thu: 19.25tr VND' },
  ];

  const headerRow = new TableRow({
    children: [
      createHeaderCell('STT', 800),
      createHeaderCell('Dau muc cong viec', 4000),
      createHeaderCell('Trang thai (% hoan thanh)', 2000),
      createHeaderCell('Ket qua dat duoc/San pham cu the', 3500),
    ],
  });

  const dataRows = tasks.map(
    (task) =>
      new TableRow({
        children: [
          createCell(task.stt, 800),
          createCell(task.task, 4000),
          createCell(task.status, 2000),
          createCell(task.result, 3500),
        ],
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function createHeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 22 })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: { fill: 'DDDDDD' },
  });
}

function createCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 22 })],
      }),
    ],
  });
}

generateReport();
