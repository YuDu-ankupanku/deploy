// utils/socket.js
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

const connectedUsers = new Map();

exports.socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('authenticate', async (userId) => {
      try {
        const user = await User.findById(userId);
        if (user) {
          connectedUsers.set(userId, socket.id);
          socket.userId = userId;
          socket.join(userId);
          console.log(`User ${userId} authenticated and joined room ${userId}`);

          const conversations = await Conversation.find({ participants: userId });
          conversations.forEach((conversation) => {
            socket.join(`conversation:${conversation._id}`);
          });
          io.emit('userOnline', userId);

          const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });
          socket.emit('unreadNotificationsCount', unreadCount);
        }
      } catch (error) {
        console.error('Socket authentication error:', error);
      }
    });

    socket.on('sendMessage', async (messageData) => {
      try {
        const { conversationId, text, media } = messageData;
        const newMessage = new Message({
          conversation: conversationId,
          sender: socket.userId,
          text,
          media,
          readBy: [socket.userId]
        });
        await newMessage.save();

        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: newMessage._id });
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', '_id username profileImage');
        io.to(`conversation:${conversationId}`).emit('newMessage', {
          ...newMessage._doc,
          sender: { _id: socket.userId }
        });
        const sender = await User.findById(socket.userId).select('username profileImage');
        const otherParticipants = conversation.participants.filter(p => p._id.toString() !== socket.userId);
        for (const participant of otherParticipants) {
          const notification = new Notification({
            recipient: participant._id,
            sender: socket.userId,
            type: 'message',
            message: newMessage._id,
            content: `${sender.username} sent you a message: ${text?.substring(0, 50)}${text?.length > 50 ? '...' : ''}`
          });
          await notification.save();
          const populatedNotification = await Notification.findById(notification._id)
            .populate('sender', '_id username profileImage');
          socket.to(participant._id.toString()).emit('newNotification', populatedNotification);
          socket.to(participant._id.toString()).emit('toastNotification', {
            message: populatedNotification.content,
            type: 'message'
          });
          const unreadCount = await Notification.countDocuments({ recipient: participant._id, read: false });
          socket.to(participant._id.toString()).emit('unreadNotificationsCount', unreadCount);
        }
      } catch (error) {
        console.error('Send message error:', error);
      }
    });

    socket.on('typing', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('userTyping', { conversationId, userId: socket.userId });
    });

    socket.on('stopTyping', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('userStoppedTyping', { conversationId, userId: socket.userId });
    });

    socket.on('markMessageRead', async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message && !message.readBy.includes(socket.userId)) {
          message.readBy.push(socket.userId);
          await message.save();
          io.to(`conversation:${message.conversation}`).emit('messageRead', { messageId, userId: socket.userId });
        }
      } catch (error) {
        console.error('Mark message read error:', error);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        io.emit('userOffline', socket.userId);
        console.log(`User ${socket.userId} disconnected`);
      }
    });
  });
};

exports.getConnectedUsers = () => connectedUsers;

exports.sendFollowNotification = async (io, type, sender, recipient) => {
  try {
    const senderUser = await User.findById(sender).select('username profileImage');
    const recipientUser = await User.findById(recipient).select('username');
    if (!senderUser || !recipientUser) return;
    console.log(`Sending ${type} notification from ${senderUser.username} to ${recipientUser.username}`);
    let content = '';
    if (type === 'follow_request_accepted') {
      content = `${senderUser.username} accepted your follow request`;
    } else if (type === 'follow_request') {
      content = `${senderUser.username} requested to follow you`;
    } else if (type === 'follow') {
      content = `${senderUser.username} started following you`;
    }
    if (content) {
      const notification = new Notification({ recipient, sender, type, content });
      await notification.save();
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', '_id username profileImage');
      io.to(recipient.toString()).emit('newNotification', populatedNotification);
      io.to(recipient.toString()).emit('toastNotification', { message: content, type });
      const unreadCount = await Notification.countDocuments({ recipient, read: false });
      io.to(recipient.toString()).emit('unreadNotificationsCount', unreadCount);
    }
  } catch (error) {
    console.error('Error sending follow notification:', error);
  }
};
