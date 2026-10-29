export default function Avatar({ user, size = 40 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (user?.photo) return <img src={user.photo} alt="" style={style} className="rounded-full object-cover" />;
  return (
    <span style={style} className="grid shrink-0 place-items-center rounded-full bg-tint font-display font-semibold text-brand">
      {(user?.name || '?').trim()[0]?.toUpperCase()}
    </span>
  );
}
