import Navbar from "../../components/Navbar"; // Going up two levels to reach src/components
import Footer from "../../components/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#050510]">
        {children}
      </main>
      <Footer />
    </>
  );
}