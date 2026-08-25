import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueName = `${crypto.randomUUID()}${ext.toLowerCase()}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

router.post('/', upload.single('file'), (req: Request, res: Response): any => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    let baseUrl = process.env.PUBLIC_URL;
    if (!baseUrl) {
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      baseUrl = `${protocol}://${host}`;
    }
    baseUrl = baseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/uploads/${req.file.filename}`;

    return res.status(201).json({
      url,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao processar upload da imagem.' });
  }
});

router.delete('/:filename', (req: Request, res: Response): any => {
  try {
    const filename = req.params.filename as string;
    if (!filename) {
      return res.status(400).json({ error: 'Nome do arquivo não fornecido.' });
    }

    // Sanitize filename to prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadDir, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.status(200).json({ message: 'Arquivo removido com sucesso.', filename: safeFilename });
    } else {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao excluir o arquivo.' });
  }
});

export default router;
