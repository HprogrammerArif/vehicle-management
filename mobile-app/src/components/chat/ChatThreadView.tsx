import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  Send,
  ArrowLeft,
  Truck,
  MapPin,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  Camera,
  Navigation,
} from 'lucide-react-native';
import { mobileChatApi } from '../../services/api';
import { getMobileSocket } from '../../services/socket';
import { useMobileStore } from '../../store/useMobileStore';
import { colors } from '../../theme/colors';

interface ChatThreadViewProps {
  conversationId: string;
  role: 'EMPLOYEE' | 'DRIVER';
}

const getRoleColor = (role: string = 'EMPLOYEE') => {
  switch (role) {
    case 'ADMIN':
      return { bg: colors.pastelBlue, badge: colors.primary, text: '#ffffff', label: 'HQ DISPATCH' };
    case 'DRIVER':
      return { bg: colors.pastelGreen, badge: colors.success, text: '#ffffff', label: 'FLEET PILOT' };
    default:
      return { bg: colors.pastelIndigo, badge: '#4F46E5', text: '#ffffff', label: 'PASSENGER' };
  }
};

export const ChatThreadView: React.FC<ChatThreadViewProps> = ({ conversationId, role }) => {
  const router = useRouter();
  const { user } = useMobileStore();
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick dispatch templates with humanized emojis
  const quickTemplates =
    role === 'DRIVER'
      ? [
          '📍 Arrived at pickup spot',
          '🚗 Delayed in traffic (~10m)',
          '⛽ Quick fuel stop',
          '✅ Trip completed safely',
          '🚨 Need dispatch support',
        ]
      : [
          '📍 Where are you right now?',
          '🏢 Waiting at the building lobby',
          '👥 Coming down with 1 colleague',
          '👍 Thanks for the safe ride!',
        ];

  // Load conversation details & messages
  const loadData = async () => {
    try {
      const res = await mobileChatApi.getConversationById(conversationId);
      if (res.success && res.data) {
        setConversation(res.data);
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.warn('Failed to load conversation details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Mark as read
    mobileChatApi.markAsRead(conversationId).catch(() => {});

    // Socket listeners
    const socket = getMobileSocket();
    socket.emit('chat:join', { conversationId });

    // Request presence
    socket.emit('presence:get');

    const handleNewMessage = (msg: any) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // Mark as read if received from others
        if (msg.senderId !== user?.id) {
          mobileChatApi.markAsRead(conversationId).catch(() => {});
        }
      }
    };

    const handleTypingIndicator = (data: { conversationId: string; userName: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId) {
        if (data.isTyping) {
          setIsTyping(true);
          setTypingUser(data.userName);
        } else {
          setIsTyping(false);
          setTypingUser('');
        }
      }
    };

    const handlePresence = (data: { onlineUserIds: string[] }) => {
      if (Array.isArray(data?.onlineUserIds)) {
        setOnlineUserIds(data.onlineUserIds);
      }
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing_indicator', handleTypingIndicator);
    socket.on('presence:sync', handlePresence);

    return () => {
      socket.emit('chat:leave', { conversationId });
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing_indicator', handleTypingIndicator);
      socket.off('presence:sync', handlePresence);
    };
  }, [conversationId, user?.id]);

  const handleSend = async (messageText?: string) => {
    const content = (messageText || text).trim();
    if (!content) return;

    if (!messageText) setText('');

    // Emit stop typing
    const socket = getMobileSocket();
    socket.emit('chat:typing', {
      conversationId,
      userId: user?.id,
      userName: user?.name,
      isTyping: false,
    });

    // Send via REST — backend persists AND broadcasts via socket automatically
    try {
      const res = await mobileChatApi.sendMessage(conversationId, content, 'TEXT');
      if (res.success && res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `local_${Date.now()}`,
          conversationId,
          senderId: user?.id,
          sender: { id: user?.id, name: user?.name, role: user?.role },
          body: content,
          messageType: 'TEXT',
          createdAt: new Date().toISOString(),
          _failed: true,
        },
      ]);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow gallery access to send photo attachments.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setIsUploading(true);
        const uploadRes = await mobileChatApi.uploadAttachment(result.assets[0].uri);
        if (uploadRes?.success && uploadRes.url) {
          const res = await mobileChatApi.sendMessage(
            conversationId,
            'Photo attachment',
            'IMAGE',
            uploadRes.url
          );
          if (res?.success && res.data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === res.data.id)) return prev;
              return [...prev, res.data];
            });
          }
        } else {
          Alert.alert('Upload Failed', uploadRes?.message || 'Could not upload photo');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Image picker error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleShareLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Location permission is required to share GPS coordinates with dispatch.');
        return;
      }

      setIsUploading(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

      const res = await mobileChatApi.sendMessage(
        conversationId,
        `📍 Live Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        'LOCATION_SHARE',
        mapsUrl
      );

      if (res?.success && res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
      }
    } catch (err: any) {
      Alert.alert('Location Error', err.message || 'Could not fetch current GPS location');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    const socket = getMobileSocket();
    socket.emit('chat:typing', {
      conversationId,
      userId: user?.id,
      userName: user?.name,
      isTyping: true,
    });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('chat:typing', {
        conversationId,
        userId: user?.id,
        userName: user?.name,
        isTyping: false,
      });
    }, 2000);
  };

  // Check if dispatch admin or other participant is online
  const isDispatchOnline = conversation?.participants?.some(
    (p: any) => p.userId !== user?.id && onlineUserIds.includes(p.userId)
  );

  const renderMessageItem = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.id;
    const isSystem = item.messageType === 'SYSTEM_EVENT';
    const isImage = item.messageType === 'IMAGE' || (item.attachmentUrl && item.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i));
    const isLocation = item.messageType === 'LOCATION_SHARE';
    const roleStyle = getRoleColor(item.sender?.role);

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemBadge}>
            <Text style={styles.systemText}>{item.body}</Text>
            <Text style={styles.systemTime}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    const senderInitial = (item.sender?.name || 'User')[0]?.toUpperCase() || 'U';

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && (
          <View style={[styles.avatarCircle, { backgroundColor: roleStyle.bg }]}>
            <Text style={[styles.avatarText, { color: roleStyle.badge }]}>{senderInitial}</Text>
          </View>
        )}

        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          {!isMe && (
            <View style={styles.senderHeader}>
              <Text style={styles.senderName}>{item.sender?.name || 'Fleet Dispatch'}</Text>
              <Text style={[styles.senderRole, { backgroundColor: roleStyle.bg, color: roleStyle.badge }]}>
                {roleStyle.label}
              </Text>
            </View>
          )}

          {/* Image preview */}
          {isImage && item.attachmentUrl && (
            <View style={styles.imageAttachmentBox}>
              <Image
                source={{ uri: item.attachmentUrl }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Location card */}
          {isLocation && (
            <View style={styles.locationCard}>
              <MapPin size={16} color={colors.success} />
              <Text style={styles.locationCardText}>GPS Coordinates Shared</Text>
            </View>
          )}

          <Text style={[styles.messageBody, isMe ? styles.myMessageText : styles.otherMessageText]}>
            {item.body}
          </Text>

          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMe ? styles.myTimeText : styles.otherTimeText]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <CheckCheck size={13} color="#C7D2FE" style={{ marginLeft: 4 }} />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={85}
      style={styles.container}
    >
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation?.subject || 'Support & Dispatch Thread'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: isDispatchOnline ? colors.success : colors.textMuted,
              }}
            />
            <Text style={[styles.headerSubtitle, { color: isDispatchOnline ? colors.success : colors.textMuted }]}>
              {conversation?.isResolved
                ? 'Resolved'
                : isDispatchOnline
                ? 'Dispatch Online'
                : 'Central Dispatch Team'}
            </Text>
          </View>
        </View>
      </View>

      {/* Linked Trip Banner (if available) */}
      {conversation?.trip && (
        <View style={styles.tripBanner}>
          <Truck size={16} color={colors.primary} />
          <View style={styles.tripBannerText}>
            <Text style={styles.tripBannerRoute}>
              {conversation.trip.fromOffice?.name || 'HQ'} &rarr; {conversation.trip.toOffice?.name || 'Plant'}
            </Text>
            <Text style={styles.tripBannerMeta}>
              Vehicle: {conversation.trip.vehicle?.registrationNo || 'Assigned Fleet'}
            </Text>
          </View>
        </View>
      )}

      {/* Messages List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Clock size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Ready for dispatch</Text>
              <Text style={styles.emptyDesc}>
                This thread connects you directly to the central fleet management team with live telemetry.
              </Text>
            </View>
          }
        />
      )}

      {/* Typing indicator */}
      {isTyping && (
        <View style={styles.typingBar}>
          <Text style={styles.typingText}>{typingUser || 'Fleet Dispatcher'} is typing...</Text>
        </View>
      )}

      {/* Quick Template Chips */}
      <View style={styles.templateScroll}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={quickTemplates}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.templateChip}
              onPress={() => handleSend(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.templateChipText}>{item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        />
      </View>

      {/* Input Controls with Photo & GPS buttons */}
      <View style={styles.inputContainer}>
        {/* Photo Button */}
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={handlePickPhoto}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Camera size={19} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        {/* Location Share Button */}
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={handleShareLocation}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          <MapPin size={19} color={colors.success} />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Message Dispatch..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={handleTextChange}
          multiline
        />

        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!text.trim() || isUploading}
        >
          <Send size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  tripBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primaryTint,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryBorder,
    gap: 12,
  },
  tripBannerText: {
    flex: 1,
  },
  tripBannerRoute: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tripBannerMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  senderRole: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: colors.textPrimary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  myTimeText: {
    color: '#E0E7FF',
  },
  otherTimeText: {
    color: colors.textMuted,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  systemBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  systemText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  systemTime: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  typingBar: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: colors.background,
  },
  typingText: {
    fontSize: 11,
    color: colors.primary,
    fontStyle: 'italic',
  },
  templateScroll: {
    paddingVertical: 8,
    backgroundColor: colors.surfaceSubtle,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  templateChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  mediaButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageAttachmentBox: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 210,
    height: 140,
    borderRadius: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.pastelGreen,
    borderWidth: 1,
    borderColor: colors.pastelGreenBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  locationCardText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
});
