import { ChatInbox } from '@/components/chat/chat-inbox';
import { requireApprovedUser } from '@/lib/auth/require-approved';

export default async function ChatsInboxPage() {
  try {
    await requireApprovedUser();
  } catch (error) {
    // Next.js redirect()/notFound() must propagate.
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      String((error as { digest: string }).digest).startsWith('NEXT_')
    ) {
      throw error;
    }
    console.error('🚨 CHATS PAGE SERVER ERROR:', error);
    throw error instanceof Error ? error : new Error('Failed to authorize chats access.');
  }

  return <ChatInbox />;
}
