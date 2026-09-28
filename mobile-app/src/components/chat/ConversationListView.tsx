import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  Plus,
  AlertTriangle,
  LifeBuoy,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react-native';
import { mobileChatApi } from '../../services/api';
import { getMobileSocket } from '../../services/socket';
import { useMobileStore } from '../../store/useMobileStore';
import { colors } from '../../theme/colors';
import { useToast } from '../AppToast';

interface ConversationListViewProps {
  role: 'EMPLOYEE' | 'DRIVER';
}

export const ConversationListView: React.FC<ConversationListViewProps> = ({ role }) => {
  const router = useRouter();
  const { user } = useMobileStore();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RESOLVED'>('ACTIVE');

  // New ticket modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newType, setNewType] = useState<'SUPPORT' | 'INCIDENT' | 'GENERAL'>('SUPPORT');
  const [newInitialMsg, setNewInitialMsg] = useState('');
  const [creating, setCreating] = useState(false);

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await mobileChatApi.getMyConversations(activeTab === 'RESOLVED');
      if (res.success && res.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.warn('Error fetching mobile conversations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchConversations();

    const socket = getMobileSocket();
    const handleNewConv = () => {
      fetchConversations();
    };

    const handlePresence = (data: { onlineUserIds: string[] }) => {
      if (Array.isArray(data?.onlineUserIds)) {
        setOnlineUserIds(data.onlineUserIds);
      }
    };

    socket.on('chat:new_conversation', handleNewConv);
    socket.on('chat:resolved', handleNewConv);
    socket.on('presence:sync', handlePresence);
    socket.emit('presence:get');

    return () => {
      socket.off('chat:new_conversation', handleNewConv);
      socket.off('chat:resolved', handleNewConv);
      socket.off('presence:sync', handlePresence);
    };
  }, [fetchConversations]);

  const handleCreateConversation = async () => {
    if (!newSubject.trim()) {
      showToast({
        type: 'warning',
        title: 'Subject Required',
        message: 'Please enter a brief topic or subject for this ticket.',
      });
      return;
    }

    setCreating(true);
    try {
      const res = await mobileChatApi.startConversation({
        type: newType,
        subject: newSubject.trim(),
        initialMessage: newInitialMsg.trim() || undefined,
      });

      if (res.success && res.data) {
        setIsModalOpen(false);
        setNewSubject('');
        setNewInitialMsg('');
        fetchConversations();

        // Navigate directly to the newly created chat
        const targetPath =
          role === 'EMPLOYEE'
            ? `/(employee)/chat/${res.data.id}`
            : `/(driver)/chat/${res.data.id}`;
        router.push(targetPath as any);
      } else {
        showToast({
          type: 'error',
          title: 'Error',
          message: res.message || 'Could not initiate conversation.',
        });
      }
    } catch (e: any) {
      showToast({
        type: 'error',
        title: 'Connection Failed',
        message: e.message || 'Server did not respond.',
      });
    } finally {
      setCreating(false);
    }
  };

  const getConvTypeIcon = (type: string) => {
    switch (type) {
      case 'TRIP_THREAD':
        return <Truck size={16} color={colors.primary} />;
      case 'INCIDENT':
        return <AlertTriangle size={16} color={colors.error} />;
      case 'SUPPORT':
      default:
        return <LifeBuoy size={16} color={colors.primary} />;
    }
  };

  const renderConversationItem = ({ item }: { item: any }) => {
    const lastMsg = item.messages && item.messages.length > 0 ? item.messages[item.messages.length - 1] : null;
    const isOnline = item.participants?.some(
      (p: any) => p.userId !== user?.id && onlineUserIds.includes(p.userId)
    );
    const targetPath =
      role === 'EMPLOYEE'
        ? `/(employee)/chat/${item.id}`
        : `/(driver)/chat/${item.id}`;

    return (
      <TouchableOpacity
        style={styles.convCard}
        onPress={() => router.push(targetPath as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.typeIconContainer}>{getConvTypeIcon(item.type)}</View>
            <Text style={styles.typeText}>{item.type.replace('_', ' ')}</Text>
            {isOnline && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
                <Text style={{ fontSize: 10, color: colors.success, fontWeight: '700' }}>Active</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>
            {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <Text style={styles.convSubject} numberOfLines={1}>
          {item.subject}
        </Text>

        {item.trip && (
          <View style={styles.tripTagBadge}>
            <Truck size={12} color={colors.primary} />
            <Text style={styles.tripTag}>
              {item.trip.fromOffice?.name} &rarr; {item.trip.toOffice?.name}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.lastMsgText} numberOfLines={1}>
            {lastMsg ? `${lastMsg.sender?.name || 'User'}: ${lastMsg.body}` : 'No messages yet'}
          </Text>
          <ArrowRight size={14} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Filter & Action Bar */}
      <View style={styles.topBar}>
        <View style={styles.tabPills}>
          <TouchableOpacity
            style={[styles.pill, activeTab === 'ACTIVE' && styles.activePill]}
            onPress={() => setActiveTab('ACTIVE')}
          >
            <Text style={[styles.pillText, activeTab === 'ACTIVE' && styles.activePillText]}>
              Active Threads
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, activeTab === 'RESOLVED' && styles.activePill]}
            onPress={() => setActiveTab('RESOLVED')}
          >
            <Text style={[styles.pillText, activeTab === 'RESOLVED' && styles.activePillText]}>
              Resolved
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.newButton}
          onPress={() => setIsModalOpen(true)}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.newButtonText}>New Ticket</Text>
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchConversations();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MessageSquare size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No conversations found</Text>
              <Text style={styles.emptyDesc}>
                {activeTab === 'ACTIVE'
                  ? 'You have no active support tickets or trip chat channels.'
                  : 'No resolved tickets in your history.'}
              </Text>
            </View>
          }
        />
      )}

      {/* New Conversation Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <KeyboardAwareScrollView
              bottomOffset={24}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.modalTitle}>Contact Fleet Management</Text>
              <Text style={styles.modalSubtitle}>
                Open a direct real-time communication channel with central dispatch
              </Text>

              {/* Type selector */}
              <View style={styles.typeSelector}>
                {(['SUPPORT', 'INCIDENT', 'GENERAL'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeButton, newType === t && styles.activeTypeButton]}
                    onPress={() => setNewType(t)}
                  >
                    <Text style={[styles.typeButtonText, newType === t && styles.activeTypeButtonText]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Subject Input */}
              <Text style={styles.inputLabel}>Subject / Topic</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Schedule delay, vehicle issue..."
                placeholderTextColor={colors.textMuted}
                value={newSubject}
                onChangeText={setNewSubject}
              />

              {/* Initial Message Input */}
              <Text style={styles.inputLabel}>Initial Message (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Describe what you need assistance with..."
                placeholderTextColor={colors.textMuted}
                value={newInitialMsg}
                onChangeText={setNewInitialMsg}
                multiline
                numberOfLines={3}
              />

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsModalOpen(false)}
                  disabled={creating}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, (!newSubject.trim() || creating) && styles.submitButtonDisabled]}
                  onPress={handleCreateConversation}
                  disabled={!newSubject.trim() || creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Start Chat</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAwareScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabPills: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activePill: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activePillText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  newButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  convCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeIconContainer: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  convSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  tripTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  tripTag: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  lastMsgText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 36,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTypeButton: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeTypeButtonText: {
    color: colors.primary,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
    marginBottom: 14,
  },
  modalTextArea: {
    minHeight: 75,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
