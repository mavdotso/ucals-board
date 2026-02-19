import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./convex-provider";

export const metadata: Metadata = {
  title: "ucals board",
  description: "Internal project board for ucals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
