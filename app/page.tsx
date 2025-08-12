"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Car, Users, Camera, MessageSquare, Activity, Zap, LogOut } from "lucide-react"
import { AuthModal } from "@/components/AuthModal"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"

export default function Dashboard() {
  const { user, profile, signOut, loading } = useAuth()
  const [stats, setStats] = useState({
    totalCars: 0,
    totalUsers: 0,
    activeCameras: 0,
    smsCount: 0,
  })
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    // Simulate loading stats
    const timer = setTimeout(() => {
      setStats({
        totalCars: 1247,
        totalUsers: 89,
        activeCameras: 4,
        smsCount: 156,
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleProtectedAction = (action: () => void) => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    action()
  }

  const StatCard = ({ title, value, icon: Icon, description, trend }: any) => (
    <Card className="bg-gray-900/50 border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        <Icon className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white mb-1">{value.toLocaleString()}</div>
        <p className="text-xs text-gray-400">{description}</p>
        {trend && (
          <Badge variant="secondary" className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">
            {trend}
          </Badge>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Zap className="h-12 w-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading CyberWatch...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-cyan-500/30 bg-gray-900/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-cyan-400" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  CyberWatch
                </h1>
              </div>
              <nav className="hidden md:flex items-center space-x-6">
                <button
                  onClick={() => handleProtectedAction(() => (window.location.href = "/camera"))}
                  className="text-gray-300 hover:text-cyan-400 transition-colors"
                >
                  Live Feed
                </button>
                <button
                  onClick={() => handleProtectedAction(() => (window.location.href = "/cars"))}
                  className="text-gray-300 hover:text-cyan-400 transition-colors"
                >
                  Car Registry
                </button>
                <button
                  onClick={() => handleProtectedAction(() => (window.location.href = "/sms"))}
                  className="text-gray-300 hover:text-cyan-400 transition-colors"
                >
                  SMS Center
                </button>
                {user && (
                  <Link href="/profile" className="text-gray-300 hover:text-cyan-400 transition-colors">
                    Profile
                  </Link>
                )}
              </nav>
              <div className="flex items-center space-x-2">
                {user && profile ? (
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-sm text-gray-300 block">
                        Welcome, {profile.first_name} {profile.last_name}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">
                        {profile.role} • {profile.department}
                      </span>
                    </div>
                    <Button
                      onClick={signOut}
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setAuthModalOpen(true)}
                    variant="outline"
                    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                  >
                    Login
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Neural Car Detection
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Advanced AI-powered vehicle monitoring system with real-time detection and automated notifications
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => handleProtectedAction(() => (window.location.href = "/camera"))}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                <Camera className="mr-2 h-5 w-5" />
                Start Monitoring
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleProtectedAction(() => (window.location.href = "/cars"))}
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
              >
                View Database
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard
              title="Total Cars Detected"
              value={stats.totalCars}
              icon={Car}
              description="Vehicles in database"
              trend="+12% this week"
            />
            <StatCard
              title="Active Users"
              value={stats.totalUsers}
              icon={Users}
              description="Registered operators"
              trend="+5 new users"
            />
            <StatCard
              title="Live Cameras"
              value={stats.activeCameras}
              icon={Camera}
              description="Currently streaming"
              trend="All online"
            />
            <StatCard
              title="SMS Sent"
              value={stats.smsCount}
              icon={MessageSquare}
              description="Notifications today"
              trend="+23 today"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center">
                  <Camera className="mr-2 h-5 w-5" />
                  Live Camera Feed
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Monitor real-time video streams from connected cameras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleProtectedAction(() => (window.location.href = "/camera"))}
                  className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
                >
                  Access Feed
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-purple-400 flex items-center">
                  <Car className="mr-2 h-5 w-5" />
                  Car Registration
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Add new vehicles and owner information to the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleProtectedAction(() => (window.location.href = "/cars/register"))}
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50"
                >
                  Register Car
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 border-green-500/30 hover:border-green-400/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  SMS Notifications
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Manage automated alerts and notification recipients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleProtectedAction(() => (window.location.href = "/sms"))}
                  className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50"
                >
                  SMS Center
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-gray-900/50 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: "2 min ago", action: "Car detected", details: "License: ABC-123", type: "detection" },
                  { time: "5 min ago", action: "SMS sent", details: "Alert to 3 recipients", type: "notification" },
                  {
                    time: "12 min ago",
                    action: "New user registered",
                    details: profile ? `${profile.first_name} ${profile.last_name}` : "john.doe@example.com",
                    type: "user",
                  },
                  { time: "18 min ago", action: "Camera online", details: "Camera #3 connected", type: "system" },
                ].map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.type === "detection"
                            ? "bg-cyan-400"
                            : activity.type === "notification"
                              ? "bg-green-400"
                              : activity.type === "user"
                                ? "bg-purple-400"
                                : "bg-yellow-400"
                        }`}
                      />
                      <div>
                        <p className="text-white font-medium">{activity.action}</p>
                        <p className="text-gray-400 text-sm">{activity.details}</p>
                      </div>
                    </div>
                    <span className="text-gray-500 text-sm">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          // Refresh the page or update state as needed
          window.location.reload()
        }}
      />
    </div>
  )
}
