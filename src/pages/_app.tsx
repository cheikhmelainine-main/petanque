import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  
  // Pages qui utilisent le layout dashboard
  const dashboardPages = ['/dashboard', '/tournaments', '/calendar', '/stats', '/players', '/settings'];
  const isDashboardPage = dashboardPages.includes(router.pathname);

  return (
    <SessionProvider session={session}>
      {isDashboardPage ? (
        <DashboardLayout>
          <Component {...pageProps} />
        </DashboardLayout>
      ) : (
        <Component {...pageProps} />
      )}
    </SessionProvider>
  );
}
