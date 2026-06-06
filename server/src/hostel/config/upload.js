import multer from 'multer';

const SPREADSHEET_MIMES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const SPREADSHEET_EXTENSIONS = new Set(['.csv', '.xls', '.xlsx']);

function spreadsheetFilter(_req, file, cb) {
  const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  if (SPREADSHEET_MIMES.has(file.mimetype) || SPREADSHEET_EXTENSIONS.has(ext)) {
    cb(null, true);
    return;
  }
  cb(new Error('Only CSV or Excel files (.csv, .xls, .xlsx) are allowed'));
}

export const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: spreadsheetFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
