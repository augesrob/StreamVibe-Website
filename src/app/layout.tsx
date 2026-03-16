import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createServerClient({ cookies: () => cookieStore });
  await supabase.auth.getSession();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}