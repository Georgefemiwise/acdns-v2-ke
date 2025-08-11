"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Phone, Shield, ArrowLeft, Save, Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/database"
import Link from "next/link"

type UserProfile = Database['public']['Tables']['users']['Row']
type ActivityLog = Database['public']['Tables']['activity_logs']['Row']

export default function Profile() {
  const { user, profile, updateProfile, loading: authLoading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState({
    carsMonitored: 0,
    alertsSent: 0,
    activeSessions: 0,
    systemUptime: '99.9%',
  })

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    role: 'operator',
  })

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone || '',
        department: profile.department || '',
        role: profile.role,
      })
    }
  }, [profile])

  // Fetch user activity and stats
  useEffect(() => {
    if (!user) return

    const fetchUserData = async () => {
      try {
        // Fetch recent activity
        const { data: activityData } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (activityData) {
          setRecentActivity(activityData)
        }

        // Fetch user stats (mock data for now)
        const { data: detectionsCount } = await supabase
          .from('detections')
          .select('id', { count: 'exact' })
          .limit(1)

        const { data: messagesCount } = await supabase
          .from('sms_messages')
          .select('id', { count: 'exact' })
          .eq('sent_by', user.id)
          .limit(1)

        setStats({
          carsMonitored: detectionsCount?.length || 0,
          alertsSent: messagesCount?.length || 0,
          activeSessions: 1, // Current session
          systemUptime: '99.9%',
        })
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }

    fetchUserData()
  }, [user])

  const handleSave = async () => {
    if (!user || !formData.first_name || !formData.last_name || !formData.email) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await updateProfile(formData)
      
      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Profile updated successfully')
        setIsEditing(false)
        
        // Log the activity
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'profile_update',
          resource_type: 'user',
          resource_id: user.id,
          details: { updated_fields: Object.keys(formData) },
        })
      }
    } catch (error) {
      setError('Failed to update profile')
      console.error('Profile update error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone || '',
        department: profile.department || '',
        role: profile.role,
      })
    }
    setIsEditing(false)
    setError('')
    setSuccess('')
  }

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-cyan-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Profile not found</p>
          <Link href="/">
            <Button className="mt-4">Go Home</Button>
          </Link>
        </div>
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
              <Button
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                className={isEditing ? "bg-green-500 hover:bg-green-600" : "bg-cyan-500 hover:bg-cyan-600"}
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  "Edit Profile"
                )}
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-400">{success}</p>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400">{error}</p>
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
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-xl">
                          {`${profile.first_name[0]}${profile.last_name[0]}`}
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
                      <p className="text-gray-400">{profile.department}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-300">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.first_name || ''}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        disabled={!isEditing}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-60"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-300">
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        value={formData.last_name || ''}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        disabled={!isEditing}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-60"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isEditing}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-60"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!isEditing}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-gray-300">
                        Department
                      </Label>
                      {isEditing ? (
                        <Select
                          value={formData.department || ''}
                          onValueChange={(value) => handleInputChange('department', value)}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="security">Security</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="management">Management</SelectItem>
                            <SelectItem value="it">IT Support</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="department"
                          value={formData.department || ''}
                          disabled
                          className="bg-gray-800 border-gray-700 text-white disabled:opacity-60"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-gray-300">
                        Role
                      </Label>
                      {isEditing ? (
                        <Select
                          value={formData.role || 'operator'}
                          onValueChange={(value) => handleInputChange('role', value as UserProfile['role'])}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="operator">Operator</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="administrator">Administrator</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="role"
                          value={formData.role || ''}
                          disabled
                          className="bg-gray-800 border-gray-700 text-white disabled:opacity-60 capitalize"
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Member Since:</span>
                        <p className="text-white">{new Date(profile.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Last Login:</span>
                        <p className="text-white">
                          {profile.last_login ? new Date(profile.last_login).toLocaleString() : 'Never'}
                        </p>
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
                    <div className="text-center p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <p className="text-2xl font-bold text-cyan-400 mb-1">{stats.carsMonitored}</p>
                      <p className="text-gray-400 text-sm">Cars Monitored</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <p className="text-2xl font-bold text-green-400 mb-1">{stats.alertsSent}</p>
                      <p className="text-gray-400 text-sm">Alerts Sent</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <p className="text-2xl font-bold text-purple-400 mb-1">{stats.activeSessions}</p>
                      <p className="text-gray-400 text-sm">Active Sessions</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <p className="text-2xl font-bold text-yellow-400 mb-1">{stats.systemUptime}</p>
                      <p className="text-gray-400 text-sm">System Uptime</p>
                    </div>
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
                      <Badge className={`${profile.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">2FA Enabled</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>
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
                            activity.action.includes('login')
                              ? "bg-green-400"
                              : activity.resource_type === "vehicles"
                                ? "bg-cyan-400"
                                : activity.action.includes('sms')
                                  ? "bg-yellow-400"
                                  : "bg-purple-400"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-white text-sm capitalize">{activity.action.replace('_', ' ')}</p>
                          <p className="text-gray-400 text-xs">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-gray-400">No recent activity</p>
                      </div>
                    )}
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
