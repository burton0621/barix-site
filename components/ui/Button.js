export function Button({ className = "", variant = "default", size = "md", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-2xl font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5", lg: "h-12 px-6 text-lg" };
  const variants = {
    default: "bg-brand text-white hover:bg-brand/80",
    outline: "border border-brand text-brand hover:bg-brand/5",
    ghost: "text-brand hover:bg-brand/5"
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}
