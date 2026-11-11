const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDirectory = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const allowedMimeTypes = (
  process.env.ALLOWED_FILE_TYPES ||
  "image/jpeg,image/png,image/gif,image/webp,application/pdf"
)
  .split(",")
  .map((type) => type.trim().toLowerCase());

const allowedExtensions = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${extension}`;

    callback(null, filename);
  },
});

const fileFilter = (req, file, callback) => {
  const mimeType = file.mimetype.toLowerCase();
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    !allowedMimeTypes.includes(mimeType) ||
    !allowedExtensions[mimeType]?.includes(extension)
  ) {
    return callback(new Error("File type is not allowed."));
  }

  callback(null, true);
};

const maxFileSize = Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
});

module.exports = upload;
