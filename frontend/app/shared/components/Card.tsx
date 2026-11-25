export default function Card({
  children,
  inverted = false,
  className,
  ...cardProps
}: React.ComponentProps<"div"> & {
  children: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <div
      {...cardProps}
      className={`${className} w-full h-full shadow-offset-primary`}
    >
      <div>{children}</div>
    </div>
  );
}
