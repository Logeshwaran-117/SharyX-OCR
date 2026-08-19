const multer = require('multer');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — matches server.js error handler message

// Map of accepted MIME types -> friendly label (used for the fileFilter error message)
const ALLOWED_MIME_TYPES = {
  'application/pdf': 'PDF',
  'text/csv': 'CSV',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'text/plain': 'Text',
  'image/png': 'Image',
  'image/jpeg': 'Image',
  'image/jpg': 'Image',
  'image/webp': 'Image',
};

// Some browsers/OSes send generic or missing MIME types for csv/txt/docx etc,
// so we also allow-list by extension as a fallback.
const ALLOWED_EXTENSIONS = ['.pdf', '.csv', '.xlsx', '.xls', '.txt', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'];

function fileFilter(req, file, cb) {
  const ext = '.' + file.originalname.split('.').pop().toLowerCase();
  const mimeOk = Object.prototype.hasOwnProperty.call(ALLOWED_MIME_TYPES, file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (mimeOk || extOk) {
    return cb(null, true);
  }

  const err = new Error(
    `Unsupported file type "${file.mimetype || ext}". Allowed: PDF, Word, Excel, CSV, TXT, or image (PNG/JPG/WEBP).`
  );
  err.status = 400;
  return cb(err);
}

const rawUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// Flexible single upload middleware supporting 'document', 'file', or any single uploaded file field
const singleDocumentMiddleware = (req, res, next) => {
  const handler = rawUpload.any();
  handler(req, res, (err) => {
    if (err) return next(err);
    if (req.files && req.files.length > 0) {
      req.file = req.files.find(f => f.fieldname === 'document') ||
                 req.files.find(f => f.fieldname === 'file') ||
                 req.files[0];
    }
    next();
  });
};

const upload = singleDocumentMiddleware;
upload.single = () => singleDocumentMiddleware;
upload.array = (name, max) => rawUpload.array(name, max);
upload.fields = (fields) => rawUpload.fields(fields);
upload.any = () => rawUpload.any();

module.exports = upload;