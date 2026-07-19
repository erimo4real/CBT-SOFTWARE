import { cn } from '@/lib/utils';

export default function PageTransition({ children, className }) {
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both',
        className
      )}
    >
      {children}
    </div>
  );
}
