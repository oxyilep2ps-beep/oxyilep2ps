import type { MemberRole } from '@/lib/chat/types';

export function oppositeRole(role: MemberRole): MemberRole {
  return role === 'INVESTOR' ? 'BORROWER' : 'INVESTOR';
}

export function displayHandle(username: string | null, fallbackName: string): string {
  if (username) return `@${username.replace(/^@/, '')}`;
  return fallbackName;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function conversationFilter(myId: string, otherId: string): string {
  return `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`;
}

export function isConversationMessage(
  message: { sender_id: string; receiver_id: string },
  myId: string,
  otherId: string
): boolean {
  return (
    (message.sender_id === myId && message.receiver_id === otherId) ||
    (message.sender_id === otherId && message.receiver_id === myId)
  );
}
