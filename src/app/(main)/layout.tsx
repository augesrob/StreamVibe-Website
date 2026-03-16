import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  )
}
