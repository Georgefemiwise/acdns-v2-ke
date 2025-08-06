import type React from "react"
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import { AuthProvider } from "@/contexts/AuthContext"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CyberWatch - Neural Car Detection System",
  description: "Advanced AI-powered vehicle monitoring system with real-time detection and automated notifications",
  generator: 'v0.dev'
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
