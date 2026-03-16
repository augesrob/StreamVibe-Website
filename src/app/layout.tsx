import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies } // Just pass 'cookies'
  );
  
  await supabase.auth.getSession();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}