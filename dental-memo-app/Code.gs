// ★ここを先生の9院の名前に変更してください★
const CLINICS = [
  'くりさき歯科こども歯科',
  '桑名歯科',
  '浜松駅前歯科クリニック',
  'たけし矯正こども歯科',
  'つづき歯科',
  '西尾のかとう歯科',
  '安城の加藤歯科',
  '寿恵野歯科',
  'オアシスデンタルクリニック'
];

const SHEET_NAME = 'メモ記録';

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('診療メモ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveMemo(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const header = sheet.getRange(1, 1, 1, 5);
    header.setValues([['日付', '時刻', '院名', '患者名', 'メモ']]);
    header.setFontWeight('bold');
    header.setBackground('#e3f2fd');
  }

  const now = new Date();
  const date = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');
  const time = Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm');

  sheet.appendRow([date, time, data.clinic, data.patient, data.memo]);
  return { success: true };
}

function searchMemos(query) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet || sheet.getLastRow() < 2) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  const q = query.toLowerCase();

  return data
    .filter(row =>
      String(row[2]).toLowerCase().includes(q) ||
      String(row[3]).toLowerCase().includes(q) ||
      String(row[4]).toLowerCase().includes(q)
    )
    .map(row => ({
      date: Utilities.formatDate(new Date(row[0]), 'Asia/Tokyo', 'yyyy/MM/dd'),
      time: row[1],
      clinic: row[2],
      patient: row[3],
      memo: row[4]
    }))
    .reverse();
}

function getClinics() {
  return CLINICS;
}
