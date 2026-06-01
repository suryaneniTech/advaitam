import path from 'path';
import fs from 'fs';
import multer from 'multer';

const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `${req.user._id}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
  }
}

export const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

export function deleteAvatarFile(profileImage) {
  if (!profileImage?.startsWith('/uploads/avatars/')) return;
  const filePath = path.join(process.cwd(), profileImage);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
