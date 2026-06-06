import * as XLSX from 'xlsx';
import { ApiError } from './security.js';

const ROOM_NUMBER_HEADERS = new Set([
  'room number',
  'room_number',
  'roomnumber',
  'room no',
  'room no.',
  'room_no',
  'number',
  'room',
]);

const CAPACITY_HEADERS = new Set(['capacity', 'cap', 'beds', 'bed capacity']);

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function findColumnIndex(headers, aliases) {
  return headers.findIndex((header) => aliases.has(header));
}

function parseCapacity(raw, rowNumber) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 2;
  const value = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(value) || value < 1 || value > 20) {
    throw new Error(`Row ${rowNumber}: capacity must be an integer between 1 and 20`);
  }
  return value;
}

function parseRoomNumber(raw, rowNumber) {
  const number = String(raw ?? '').trim();
  if (!number) throw new Error(`Row ${rowNumber}: room number is required`);
  return number;
}

export function parseRoomSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw ApiError.badRequest('Spreadsheet is empty');

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rows.length) throw ApiError.badRequest('Spreadsheet is empty');

  const headerRow = rows[0].map(normalizeHeader);
  const numberIdx = findColumnIndex(headerRow, ROOM_NUMBER_HEADERS);
  const capacityIdx = findColumnIndex(headerRow, CAPACITY_HEADERS);

  if (numberIdx === -1) {
    throw ApiError.badRequest(
      'Missing room number column. Expected a header like "room number" or "number".',
    );
  }
  if (capacityIdx === -1) {
    throw ApiError.badRequest('Missing capacity column. Expected a header like "capacity".');
  }

  const parsed = [];
  const errors = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNumber = i + 1;
    try {
      parsed.push({
        rowNumber,
        number: parseRoomNumber(row[numberIdx], rowNumber),
        capacity: parseCapacity(row[capacityIdx], rowNumber),
      });
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  if (!parsed.length && errors.length) {
    throw ApiError.badRequest('No valid rows found in file', errors);
  }

  return { rows: parsed, errors };
}
