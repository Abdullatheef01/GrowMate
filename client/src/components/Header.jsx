import Logo from './Logo';
import Avatar from './Avatar';

export default function Header({ user, onProfile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <button
          onClick={onProfile}
          aria-label="Open profile"
          className="flex items-center gap-3 rounded-full py-1 pl-3 pr-1 transition hover:bg-tint"
        >
          <span className="hidden max-w-[10rem] truncate font-display text-sm font-medium text-ink sm:block">
            {user?.name}
          </span>
          <Avatar user={user} size={40} />
        </button>
      </div>
    </header>
  );
}