"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Phone, Shield, ArrowLeft, Save, Camera, AlertCircle, CheckCircle } from "lucide-react"
import { AuthModal } from "@/components/AuthModal"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"

export default function Profile() {
  const { user, profile, updateProfile, loading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    department: "",
  })

  // Check authentication on mount
  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true)
    }
  }, [user, loading])

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        department: profile.department || "",
      })
    }
  }, [profile])

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    setMessage({ type: "", text: "" })

    try {
      const { error } = await updateProfile({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        phone: profileForm.phone.trim(),
        department: profileForm.department,
      })

      if (error) {
        setMessage({ type: "error", text: "Failed to update profile. Please try again." })
      } else {
        setMessage({ type: "success", text: "Profile updated successfully!" })
        setIsEditing(false)
        setTimeout(() => setMessage({ type: "", text: "" }), 3000)
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        department: profile.department || "",
      })
    }
    setIsEditing(false)
    setMessage({ type: "", text: "" })
  }

  const stats = [
    { label: "Cars Monitored", value: "1,247", color: "cyan" },
    { label: "Alerts Sent", value: "156", color: "green" },
    { label: "Active Sessions", value: "3", color: "purple" },
    { label: "System Uptime", value: "99.9%", color: "yellow" },
  ]

  const recentActivity = [
    { action: "Logged into system", time: "2 hours ago", type: "login" },
    { action: "Added new vehicle ABC-123", time: "4 hours ago", type: "vehicle" },
    { action: "Sent SMS alert", time: "6 hours ago", type: "alert" },
    { action: "Updated camera settings", time: "1 day ago", type: "system" },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-cyan-500/30 bg-gray-900/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  User Profile
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} size="sm" className="bg-cyan-500 hover:bg-cyan-600">
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Message Display */}
          {message.text && (
            <div
              className={`mb-6 flex items-center space-x-2 p-4 rounded-lg border ${
                message.type === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-green-500/10 border-green-500/30 text-green-400"
              }`}
            >
              {message.type === "error" ? (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-2 border-cyan-500/50">
                        <AvatarImage src={profile.avatar_url || "/placeholder.svg?height=80&width=80"} />
                        <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-xl">
                          {profile.first_name?.[0]}
                          {profile.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {isEditing && (
                        <Button
                          size="sm"
                          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-purple-500 hover:bg-purple-600"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        {profile.first_name} {profile.last_name}
                      </h2>
                      <p className="text-purple-400 font-medium capitalize">{profile.role}</p>
                      <p className="text-gray-400 capitalize">{profile.department}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-300">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                        disabled={!isEditing}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-300">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                        disabled={!isEditing}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email || ""}
                        disabled={true}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-60"
                      />
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-gray-300">
                        Department
                      </Label>
                      <select
                        id="department"
                        value={profileForm.department}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 disabled:opacity-60"
                      >
                        <option value="">Select Department</option>
                        <option value="security">Security</option>
                        <option value="operations">Operations</option>
                        <option value="management">Management</option>
                        <option value="it">IT Support</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-gray-300">
                        Role
                      </Label>
                      <Input
                        id="role"
                        value={profile.role}
                        disabled={true}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-60 capitalize"
                      />
                      <p className="text-xs text-gray-500">Role can only be changed by administrators</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Member Since:</span>
                        <p className="text-white">{new Date(profile.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Last Updated:</span>
                        <p className="text-white">{new Date(profile.updated_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Stats */}
              <Card className="bg-gray-900/50 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-purple-400">Activity Overview</CardTitle>
                  <CardDescription className="text-gray-400">Your system usage statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((stat, index) => (
                      <div key={index} className="text-center p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <p className={`text-2xl font-bold text-${stat.color}-400 mb-1`}>{stat.value}</p>
                        <p className="text-gray-400 text-sm">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account Status */}
              <Card className="bg-gray-900/50 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-green-400 flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Account Type</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 capitalize">
                        {profile.role}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status</span>
                      <Badge
                        className={
                          profile.is_active
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {profile.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Email Verified</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Yes</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-800/50">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            activity.type === "login"
                              ? "bg-green-400"
                              : activity.type === "vehicle"
                                ? "bg-cyan-400"
                                : activity.type === "alert"
                                  ? "bg-yellow-400"
                                  : "bg-purple-400"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-white text-sm">{activity.action}</p>
                          <p className="text-gray-400 text-xs">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-gray-900/50 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-purple-400">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Security Settings
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Notification Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
