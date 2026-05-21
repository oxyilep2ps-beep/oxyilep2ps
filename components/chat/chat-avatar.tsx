import { User } from 'lucide-react';
import { initials } from '@/lib/chat/utils';
import { cn } from '@/lib/utils';

type ChatAvatarProps = {
  name: string;
  avatarUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'h-10 w-10 text-[10px]',
  md: 'h-12 w-12 text-xs',
  lg: 'h-14 w-14 text-sm',
};

export function ChatAvatar({ name, avatarUrl, size = 'md', className }: ChatAvatarProps) {
  const dim = sizeMap[size];

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-full bg-brand-500/10 ring-2 ring-brand-500/20',
        dim,
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center font-bold text-brand-600 dark:text-brand-300">
          {initials(name) || <User size={size === 'lg' ? 22 : 18} />}
        </div>
      )}
    </div>
  );
}
