export default function FrameOSLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="FrameOS Logo" 
      className={`object-contain ${className}`}
    />
  );
}
