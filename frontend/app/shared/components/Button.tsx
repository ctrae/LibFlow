"use client";

export default function Button({
  text,
  variant = "primary",
  className,
  type = "button",
  disabled,
  icon,
  ...buttonProps
}: React.ComponentProps<"button"> & {
  text: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "warning" | "none";
}) {
  const baseClass =
    "flex gap-2 justify-center items-center px-4 py-2.5 cursor-pointer font-semibold ";

  const variantClass = () => {
    if (!disabled) {
      switch (variant) {
        case "primary":
          return `${"bg-primary hover:bg-primary/80"}  text-white`;
        case "secondary":
          return `${"bg-secondary hover:bg-secondary/80"}  text-white`;
        case "warning":
          return `text-white bg-warning hover:bg-warning/80 cursor-pointer`;
        default:
          return "";
      }
    } else {
      return `bg-gray-300 cursor-not-allowed`;
    }
  };
  return (
    <button
      {...buttonProps}
      disabled={disabled}
      type={type}
      className={`${baseClass} ${variantClass()} ${className}`}
    >
      {icon}
      {text}
    </button>
  );
}
