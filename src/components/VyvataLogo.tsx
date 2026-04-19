import Image from "next/image";

export function VyvataLogo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/logo/vyvata.svg"
      alt="Vyvata"
      width={size}
      height={size}
      priority
      className="shrink-0"
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
