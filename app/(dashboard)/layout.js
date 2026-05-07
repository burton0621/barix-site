import FeedbackButton from "@/components/FeedbackButton/FeedbackButton";
import DashboardNavbar from "@/components/Navbar/DashboardNav/DashboardNavbar";

export default function DashboardLayout({ children }) {
  return (
    <>
      <DashboardNavbar /> 
      {children}
      <FeedbackButton />
    </>
  );
}