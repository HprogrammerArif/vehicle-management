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
  Alert,
} from 'react-native';
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

interface ConversationListViewProps {
  role: 'EMPLOYEE' | 'DRIVER';
}

export const ConversationListView: React.FC<ConversationListViewProps> = ({ role }) => {
  const router = useRouter();
  const { user } = useMobileStore();
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
      Alert.alert('Subject Required', 'Please enter a brief topic or subject for this ticket.');
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
        Alert.alert('Error', res.message || 'Could not initiate conversation');
      }
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message || 'Server did not respond');
    } finally {
      setCreating(false);
    }
  };

  const getConvTypeIcon = (type: string) => {
    switch (type) {
      case 'TRIP_THREAD':
        return <Truck size={16} color="#818cf8" />;
      case 'INCIDENT':
        return <AlertTriangle size={16} color="#fb7185" />;
      case 'SUPPORT':
      default:
        return <LifeBuoy size={16} color="#38bdf8" />;
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
                <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '600' }}>Active</Text>
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
          <Text style={styles.tripTag}>
            Route: {item.trip.fromOffice?.name} &rarr; {item.trip.toOffice?.name}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.lastMsgText} numberOfLines={1}>
            {lastMsg ? `${lastMsg.sender?.name || 'User'}: ${lastMsg.body}` : 'No messages yet'}
          </Text>
          <ArrowRight size={14} color="#64748b" />
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
          <ActivityIndicator size="large" color="#6366f1" />
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
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={44} color="#334155" />
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
      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
              placeholderTextColor="#64748b"
              value={newSubject}
              onChangeText={setNewSubject}
            />

            {/* Initial Message Input */}
            <Text style={styles.inputLabel}>Initial Message (Optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Describe what you need assistance with..."
              placeholderTextColor="#64748b"
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
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  tabPills: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  activePill: {
    backgroundColor: '#4f46e5',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activePillText: {
    color: '#ffffff',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeIconContainer: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 11,
    color: '#64748b',
  },
  convSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  tripTag: {
    fontSize: 11,
    color: '#818cf8',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  lastMsgText: {
    flex: 1,
    fontSize: 12,
    color: '#94a3b8',
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 36,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
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
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeTypeButton: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  typeButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeTypeButtonText: {
    color: '#ffffff',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 14,
  },
  modalTextArea: {
    minHeight: 70,
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
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
