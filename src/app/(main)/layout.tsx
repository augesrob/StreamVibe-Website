import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

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