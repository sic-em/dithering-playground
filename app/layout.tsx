import { Geist_Mono } from "next/font/google"
import { DialRoot } from "dialkit"
import "dialkit/styles.css"
import localFont from "next/font/local"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const sfProDisplay = localFont({
  variable: "--font-sf-pro-display",
  src: [
    {
      path: "../public/fonts/SFPRODISPLAYREGULAR.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/SFPRODISPLAYMEDIUM.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/SFPRODISPLAYBOLD.otf",
      weight: "700",
      style: "normal",
    },
  ],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(sfProDisplay.variable, geistMono.variable, "antialiased")}
      >
        <ThemeProvider>
          {children}
          <DialRoot position="top-left" />
        </ThemeProvider>
      </body>
    </html>
  )
}
