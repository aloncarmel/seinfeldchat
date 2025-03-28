import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Chat with Seinfeld Characters",
  description: "Have a conversation with your favorite Seinfeld character using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://buttons.github.io/buttons.js" />
      </head>
      <body
        style={{ backgroundImage: 'url("/apartmentbackground.png")' }}
        className={`min-h-screen antialiased relative  inset-0 bg-cover bg-center bg-no-repeat`}
      >
        {children}
      </body>
    </html>
  );
}
