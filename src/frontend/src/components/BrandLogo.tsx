import Image from 'next/image';

export function BrandLogo({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/libflow-logo.webp"
      alt="Libflow"
      width={size}
      height={size}
      priority
      className={className}
    />
  );
}
