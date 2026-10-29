// Round "+" button used to add a table / counselling / batch
export default function Fab({ onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-brand text-3xl font-light leading-none text-white shadow-lg transition hover:bg-brand-dark">
      +
    </button>
  );
}
