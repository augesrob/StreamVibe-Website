import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import "@/app/globals.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  await supabase.auth.getSession();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}