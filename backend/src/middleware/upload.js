const multer = require('multer');

const ALLOWED_EXTENSIONS = /\.(xlsx|xls|xlsm)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
      return cb(new Error('Only Excel files (.xlsx, .xls, .xlsm) are supported'));
    }
    cb(null, true);
  },
});

module.exports = upload;
