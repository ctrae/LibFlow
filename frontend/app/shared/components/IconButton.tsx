export default function IconButton({
  icon,
  onClick,
  isActive,
  ...props
}: React.ComponentProps<"button"> & {
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      {...props}
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md cursor-pointer ${
        isActive ? "text-secondary" : " text-slate-400"
      }`}
    >
      <span className="h-5 w-5">{icon}</span>
    </button>
  );
}
