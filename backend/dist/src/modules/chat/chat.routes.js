"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const chat_controller_1 = require("./chat.controller");
const router = (0, express_1.Router)();
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
