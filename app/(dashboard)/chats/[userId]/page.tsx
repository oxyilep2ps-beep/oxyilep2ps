import { ChatRoom } from '@/components/chat/chat-room';
import { requireApprovedUser } from '@/lib/auth/require-approved';

type ChatRoomPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function ChatRoomPage({ params }: ChatRoomPageProps) {
  await requireApprovedUser();
  const { userId } = await params;
  return <ChatRoom peerUserId={userId} />;
}
