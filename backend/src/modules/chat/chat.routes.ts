import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../../middleware/auth';
import {
  getAllConversations,
  getMyConversations,
  getUnreadCount,
  startConversation,
  getConversationById,
  getMessages,
  sendMessage,
  markAsRead,
  resolveConversation,
} from './chat.controller';

const router = Router();

// Multer storage setup for chat attachments
const uploadDir = path.join(__dirname, '../../../uploads/chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// 0. Upload attachment
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    const fileUrl = `https://vehicle-management-a6yi.onrender.com/uploads/chat/${req.file.filename}`;
    return res.json({
      success: true,
      url: fileUrl,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'File upload failed' });
  }
});

// 1. Admin Inbox: all conversations
router.get('/', authenticate, authorize(['ADMIN']), getAllConversations);

// 2. User's own conversations
router.get('/mine', authenticate, getMyConversations);

// 3. Unread count badge
router.get('/unread-count', authenticate, getUnreadCount);

// 4. Start a conversation
router.post('/', authenticate, startConversation);

// 5. Single conversation detail
router.get('/:id', authenticate, getConversationById);

// 6. Paginated message history
router.get('/:id/messages', authenticate, getMessages);

// 7. Send message via REST
router.post('/:id/messages', authenticate, sendMessage);

// 8. Mark as read
router.put('/:id/read', authenticate, markAsRead);

// 9. Resolve conversation (Admin only)
router.put('/:id/resolve', authenticate, authorize(['ADMIN']), resolveConversation);

export default router;
