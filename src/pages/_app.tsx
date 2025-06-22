import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/router";
import { AppSidebar } from "@/components/layout/Navigation";
import { QueryClient, QueryClientProvider, HydrationBoundary } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export default function App({
  Component,
  pageProps: { session, dehydratedState, ...pageProps },
}: AppProps) {
  const router = useRouter();
  
  // Pages qui n'utilisent PAS le layout navigation (pages publiques)
  const publicPages = ['/auth', '/login', '/register', '/'];
  const isPublicPage = publicPages.includes(router.pathname);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <SessionProvider session={session}>
          <div className="min-h-screen bg-background">
            {!isPublicPage ? (
              <AppSidebar>
                <Component {...pageProps} />
              </AppSidebar>
            ) : (
              <Component {...pageProps} />
            )}
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </SessionProvider>
      </HydrationBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
