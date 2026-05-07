export default function SkeletonLoader({ height = 16 }: { height?: number }) {
  return (
    <div
      className="animate-shimmer"
      style={{
        height,
        width: "100%",
        borderRadius: 8,
      }}
    />
  );
}
