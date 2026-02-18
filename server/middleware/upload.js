const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

function createStorage(subfolder) {
  const dest = path.join(__dirname, '../../uploads', subfolder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const photoFilter = (_req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error('Only image files are allowed'));
};

const videoFilter = (_req, file, cb) => {
  const allowed = ['.mp4', '.webm', '.mov'];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error('Only video files are allowed'));
};

const pdfFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  ext === '.pdf' ? cb(null, true) : cb(new Error('Only PDF files are allowed'));
};

const uploadPhoto = multer({
  storage: createStorage('photos'),
  fileFilter: photoFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 50 },
});

const uploadVideo = multer({
  storage: createStorage('videos'),
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
});

const uploadCertificate = multer({
  storage: createStorage('certificates'),
  fileFilter: pdfFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 100 },
});

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

module.exports = { uploadPhoto, uploadVideo, uploadCertificate, uploadCsv };
