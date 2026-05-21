import { redirect } from 'next/navigation';

/** Legacy route — chat inbox moved to /chats */
export default function LegacyChatRedirect() {
  redirect('/chats');
}
