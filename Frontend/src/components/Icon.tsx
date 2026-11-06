interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export default function Icon({ name, size = 24, className = '' }: IconProps) {
  return (
    <img
      src={`/icons/${name}.svg`}
      alt={name}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    />
  );
}