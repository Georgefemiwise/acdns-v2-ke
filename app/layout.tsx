import type React from "react"
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import { AuthProvider } from "@/contexts/AuthContext"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Acdns - Automatic Car Detection Notification System",
  description: "AI-powered vehicle detection system with automated notifications",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
