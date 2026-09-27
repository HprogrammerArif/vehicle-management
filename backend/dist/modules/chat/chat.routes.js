"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../../middleware/auth");
const chat_controller_1 = require("./chat.controller");
const router = (0, express_1.Router)();
// Multer storage setup for chat attachments
const uploadDir = path_1.default.join(__dirname, '../../../uploads/chat');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `attachment-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});
// 0. Upload attachment
router.post('/upload', auth_1.authenticate, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }
        const fileUrl = `http://localhost:5000/uploads/chat/${req.file.filename}`;
        return res.json({
            success: true,
            url: fileUrl,
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'File upload failed' });
    }
});
// 1. Admin Inbox: all conversations
router.get('/', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), chat_controller_1.getAllConversations);
// 2. User's own conversations
router.get('/mine', auth_1.authenticate, chat_controller_1.getMyConversations);
// 3. Unread count badge
router.get('/unread-count', auth_1.authenticate, chat_controller_1.getUnreadCount);
// 4. Start a conversation
router.post('/', auth_1.authenticate, chat_controller_1.startConversation);
// 5. Single conversation detail
router.get('/:id', auth_1.authenticate, chat_controller_1.getConversationById);
// 6. Paginated message history
router.get('/:id/messages', auth_1.authenticate, chat_controller_1.getMessages);
// 7. Send message via REST
router.post('/:id/messages', auth_1.authenticate, chat_controller_1.sendMessage);
// 8. Mark as read
router.put('/:id/read', auth_1.authenticate, chat_controller_1.markAsRead);
// 9. Resolve conversation (Admin only)
router.put('/:id/resolve', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), chat_controller_1.resolveConversation);
exports.default = router;
