import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ChatThreadView } from '../../../src/components/chat/ChatThreadView';

export default function DriverChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ChatThreadView conversationId={id} role="DRIVER" />;
}
