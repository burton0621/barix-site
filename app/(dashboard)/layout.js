import FeedbackButton from "@/components/FeedbackButton/FeedbackButton";

export default function DashboardLayout({ children }) {
  return (
    <>
      {children}
      <FeedbackButton />
    </>
  );
}