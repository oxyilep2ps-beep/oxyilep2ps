import { ChatInbox } from '@/components/chat/chat-inbox';
import { requireApprovedUser } from '@/lib/auth/require-approved';

export default async function ChatsInboxPage() {
  await requireApprovedUser();
  return <ChatInbox />;
}
