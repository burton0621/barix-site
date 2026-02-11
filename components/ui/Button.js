export function Button({ className = "", variant = "default", size = "md", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { 
    sm: "h-9 px-4 text-sm", 
    md: "h-11 px-5 text-sm", 
    lg: "h-12 px-8 text-base" 
  };
  const variants = {
    default: "bg-gradient-to-r from-brand-900 to-brand-700 text-white hover:from-brand-800 hover:to-brand-600 active:from-brand-950 active:to-brand-800",
    outline: "border-2 border-brand-900 text-brand-900 hover:bg-brand-900/5 active:bg-brand-900/10",
    ghost: "text-brand-900 hover:bg-brand-900/5 active:bg-brand-900/10"
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}
