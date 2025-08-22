export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-black ${
        props.className ?? ""
      }`}
    />
  );
}
