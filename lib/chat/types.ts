export type MemberRole = 'INVESTOR' | 'BORROWER';

export type PresenceStatus = 'online' | 'offline';

export type ChatPeer = {
  id: string;
  role: MemberRole;
  full_legal_name: string;
  username: string | null;
  avatar_url: string | null;
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type UserPresence = {
  user_id: string;
  status: PresenceStatus;
  last_seen: string;
};

export type HandshakePaymentStatus = 'PENDING' | 'PAID';

export type HandshakeRow = {
  id: string;
  lender_id: string;
  borrower_id: string;
  amount: number;
  rate: number;
  duration: number;
  emi_amount: number | null;
  total_return: number | null;
  payment_status: HandshakePaymentStatus;
  polygon_tx_hash: string | null;
  status: 'PENDING' | 'ACTIVE';
  lender_approved_at: string | null;
  borrower_approved_at: string | null;
  created_at: string;
};
