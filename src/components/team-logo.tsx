import Image from "next/image";

export function TeamLogo({
  className,
  title = "Lovejoy TFC",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <Image
      src="/logo-lovejoy-xc.png"
      alt={title}
      width={240}
      height={240}
      className={className}
    />
  );
}
