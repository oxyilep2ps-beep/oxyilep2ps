import { PremiumChatShell } from '@/components/chat/premium-chat-shell';
import { requireApprovedUser } from '@/lib/auth/require-approved';

type ChatRoomPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function ChatRoomPage({ params }: ChatRoomPageProps) {
  try {
    await requireApprovedUser();
    const { userId } = await params;
    if (!userId?.trim()) {
      throw new Error('Missing chat user id.');
    }
    return <PremiumChatShell initialPeerId={userId} />;
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
    console.error('🚨 CHAT ROOM PAGE SERVER ERROR:', error);
    throw error instanceof Error ? error : new Error('Failed to load chat room.');
  }
}
