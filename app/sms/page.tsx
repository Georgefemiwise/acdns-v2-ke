"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, Users, ArrowLeft, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { AuthModal } from "@/components/AuthModal"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

import { aiSmsGenerator, AiSmsGenerator } from "@/lib/ai-sms-generator"
import type { SmsGenerationOptions } from "@/lib/ai-sms-generator"

interface SmsRecipient {
  id: string
  name: string
  phone: string
  is_active: boolean
  created_at: string
}

export default function SMSCenter() {
  const { user, loading } = useAuth()
  const [message, setMessage] = useState("")
  const [newRecipient, setNewRecipient] = useState({ name: "", phone: "" })
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [recipients, setRecipients] = useState<SmsRecipient[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [messageOptions, setMessageOptions] = useState<Partial<SmsGenerationOptions>>({
    messageType: "detection",
    tone: "professional",
    length: "medium",
    includeEmoji: false,
  })
  const [generatedVariations, setGeneratedVariations] = useState<string[]>([])

  // Check authentication on mount
  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true)
    }
  }, [user, loading])

  useEffect(() => {
    if (user) {
      fetchRecipients()
    }
  }, [user])

  const fetchRecipients = async () => {
    try {
      setLoadingRecipients(true)
      const { data, error } = await supabase
        .from("sms_recipients")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        setError(`Failed to load recipients: ${error.message}`)
      } else {
        setRecipients(data || [])
      }
    } catch (error) {
      console.error("Error fetching recipients:", error)
      setError("An unexpected error occurred")
    } finally {
      setLoadingRecipients(false)
    }
  }

  const handleSendMessage = async () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    if (!message.trim()) {
      setError("Please enter a message")
      return
    }

    try {
      setError("")
      setSuccess("")

      // In a real app, you would integrate with an SMS service like Twilio
      // For now, we'll just simulate sending
      const activeRecipients = recipients.filter((r) => r.is_active)

      if (activeRecipients.length === 0) {
        setError("No active recipients found")
        return
      }

      // Simulate SMS sending delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setSuccess(`Message sent to ${activeRecipients.length} recipients successfully!`)
      setMessage("")

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message")
    }
  }

  const handleAddRecipient = async () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    if (!newRecipient.name.trim() || !newRecipient.phone.trim()) {
      setError("Please enter both name and phone number")
      return
    }

    try {
      setError("")
      const { error } = await supabase.from("sms_recipients").insert({
        name: newRecipient.name.trim(),
        phone: newRecipient.phone.trim(),
        is_active: true,
        created_by: user.id,
      })

      if (error) {
        setError(`Failed to add recipient: ${error.message}`)
      } else {
        setSuccess("Recipient added successfully!")
        setNewRecipient({ name: "", phone: "" })
        fetchRecipients() // Refresh the list
        setTimeout(() => setSuccess(""), 3000)
      }
    } catch (error) {
      console.error("Error adding recipient:", error)
      setError("An unexpected error occurred")
    }
  }

  const deleteRecipient = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recipient?")) return

    try {
      const { error } = await supabase.from("sms_recipients").delete().eq("id", id)

      if (error) {
        setError(`Failed to delete recipient: ${error.message}`)
      } else {
        setRecipients(recipients.filter((r) => r.id !== id))
        setSuccess("Recipient deleted successfully!")
        setTimeout(() => setSuccess(""), 3000)
      }
    } catch (error) {
      console.error("Error deleting recipient:", error)
      setError("An unexpected error occurred")
    }
  }

  const generateAIMessage = async () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    setIsGeneratingMessage(true)
    try {
      const placeholders = {
        vehicleLicense: "ABC-123",
        cameraLocation: "Main Entrance",
        detectionTime: new Date().toLocaleString(),
        confidenceScore: "95.2",
        systemName: "CyberWatch",
      }

      const options: SmsGenerationOptions = {
        messageType: messageOptions.messageType || "detection",
        tone: messageOptions.tone || "professional",
        length: messageOptions.length || "medium",
        includeEmoji: messageOptions.includeEmoji || false,
        placeholders,
      }

      const variations = await aiSmsGenerator.generateVariations(options, 3)
      const messages = variations.map((v) => AiSmsGenerator.replacePlaceholders(v.message, placeholders))
      setGeneratedVariations(messages)
    } catch (error) {
      console.error("Failed to generate AI message:", error)
      setError("Failed to generate AI message")
    } finally {
      setIsGeneratingMessage(false)
    }
  }

  const recentMessages = [
    {
      id: 1,
      message: "Car detected: ABC-123 at Main Entrance",
      recipients: recipients.filter((r) => r.is_active).length,
      timestamp: "2024-01-15 14:30",
      status: "sent",
    },
    {
      id: 2,
      message: "Unauthorized vehicle in restricted zone",
      recipients: 2,
      timestamp: "2024-01-15 12:15",
      status: "sent",
    },
    {
      id: 3,
      message: "System maintenance scheduled for tonight",
      recipients: recipients.length,
      timestamp: "2024-01-15 09:20",
      status: "sent",
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading SMS center...</p>
        </div>
      </div>
    )
  }

  if (!user) {
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
                  SMS Notification Center
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  {recipients.filter((r) => r.is_active).length} Active Recipients
                </Badge>
                <span className="text-sm text-gray-300">{user.user_metadata?.first_name || user.email}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Message Display */}
          {error && (
            <div className="mb-6 flex items-center space-x-2 p-4 rounded-lg border bg-red-500/10 border-red-500/30 text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-center space-x-2 p-4 rounded-lg border bg-green-500/10 border-green-500/30 text-green-400">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Send Message */}
            <div className="space-y-6">
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Send SMS Alert
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Send notifications to all active recipients
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-gray-300">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Enter your alert message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500 min-h-[120px]"
                      />
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>{message.length}/160 characters</span>
                        <span>Will send to {recipients.filter((r) => r.is_active).length} recipients</span>
                      </div>
                    </div>

                    <div className="mt-4 p-4 border border-purple-500/30 rounded-lg bg-purple-500/5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-purple-400 font-medium">AI Message Assistant</h4>
                        <Button
                          onClick={generateAIMessage}
                          disabled={isGeneratingMessage}
                          size="sm"
                          className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50"
                        >
                          {isGeneratingMessage ? "Generating..." : "Generate AI Message"}
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <select
                          className="bg-gray-800 border-gray-700 text-white text-sm rounded px-2 py-1"
                          value={messageOptions.tone}
                          onChange={(e) => setMessageOptions((prev) => ({ ...prev, tone: e.target.value as any }))}
                        >
                          <option value="professional">Professional</option>
                          <option value="friendly">Friendly</option>
                          <option value="urgent">Urgent</option>
                          <option value="casual">Casual</option>
                        </select>

                        <select
                          className="bg-gray-800 border-gray-700 text-white text-sm rounded px-2 py-1"
                          value={messageOptions.length}
                          onChange={(e) => setMessageOptions((prev) => ({ ...prev, length: e.target.value as any }))}
                        >
                          <option value="short">Short</option>
                          <option value="medium">Medium</option>
                          <option value="long">Long</option>
                        </select>

                        <select
                          className="bg-gray-800 border-gray-700 text-white text-sm rounded px-2 py-1"
                          value={messageOptions.messageType}
                          onChange={(e) =>
                            setMessageOptions((prev) => ({ ...prev, messageType: e.target.value as any }))
                          }
                        >
                          <option value="detection">Detection</option>
                          <option value="alert">Alert</option>
                          <option value="welcome">Welcome</option>
                          <option value="reminder">Reminder</option>
                        </select>

                        <label className="flex items-center text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={messageOptions.includeEmoji}
                            onChange={(e) => setMessageOptions((prev) => ({ ...prev, includeEmoji: e.target.checked }))}
                            className="mr-1"
                          />
                          Emojis
                        </label>
                      </div>

                      {generatedVariations.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-400">Generated variations (click to use):</p>
                          {generatedVariations.map((variation, index) => (
                            <div
                              key={index}
                              onClick={() => setMessage(variation)}
                              className="p-2 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-800/70 transition-colors text-sm text-gray-300 border border-gray-700/50"
                            >
                              {variation}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                      className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send SMS Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Add Recipient */}
              <Card className="bg-gray-900/50 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-purple-400 flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Add New Recipient
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="recipientName" className="text-gray-300">
                          Name
                        </Label>
                        <Input
                          id="recipientName"
                          placeholder="Contact name"
                          value={newRecipient.name}
                          onChange={(e) => setNewRecipient((prev) => ({ ...prev, name: e.target.value }))}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recipientPhone" className="text-gray-300">
                          Phone Number
                        </Label>
                        <Input
                          id="recipientPhone"
                          type="tel"
                          placeholder="+1-555-0123"
                          value={newRecipient.phone}
                          onChange={(e) => setNewRecipient((prev) => ({ ...prev, phone: e.target.value }))}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleAddRecipient}
                      disabled={!newRecipient.name.trim() || !newRecipient.phone.trim()}
                      className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Recipient
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recipients and History */}
            <div className="space-y-6">
              {/* Recipients List */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    SMS Recipients
                  </CardTitle>
                  <CardDescription className="text-gray-400">Manage notification recipients</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingRecipients ? (
                    <div className="text-center py-4">
                      <Users className="h-6 w-6 text-cyan-400 mx-auto mb-2 animate-pulse" />
                      <p className="text-gray-400 text-sm">Loading recipients...</p>
                    </div>
                  ) : recipients.length > 0 ? (
                    <div className="space-y-3">
                      {recipients.map((recipient) => (
                        <div
                          key={recipient.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-white font-medium">{recipient.name}</p>
                              <Badge
                                variant={recipient.is_active ? "default" : "secondary"}
                                className={
                                  recipient.is_active
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                }
                              >
                                {recipient.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-gray-400 text-sm">{recipient.phone}</p>
                            <p className="text-gray-500 text-xs">
                              Added: {new Date(recipient.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRecipient(recipient.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No recipients added yet</p>
                      <p className="text-gray-500 text-sm">Add your first SMS recipient above</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Messages */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Recent Messages</CardTitle>
                  <CardDescription className="text-gray-400">SMS notification history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentMessages.map((msg) => (
                      <div key={msg.id} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-white text-sm flex-1 mr-2">{msg.message}</p>
                          <Badge
                            variant={msg.status === "sent" ? "default" : "destructive"}
                            className={
                              msg.status === "sent" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""
                            }
                          >
                            {msg.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Sent to {msg.recipients} recipients</span>
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>
                    ))}
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
