"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, UserPlus, Trash2, Users, Clock, CheckCircle, AlertCircle, Heart, Zap } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { generateWelcomeMessage, generateDetectionAlert } from "@/lib/ai-sms-generator"
import { sendWelcomeSms, sendBulkSms, smsService } from "@/lib/sms-service"

interface SmsRecipient {
  id: string
  name: string
  phone: string
  created_at: string
  is_active: boolean
}

interface SmsMessage {
  id: string
  message_content: string
  message_type: string
  recipients_count: number
  status: string
  sent_at: string
  created_at: string
}

export default function SmsPage() {
  const { user } = useAuth()
  const [recipients, setRecipients] = useState<SmsRecipient[]>([])
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [addingRecipient, setAddingRecipient] = useState(false)
  const [sendingWelcome, setSendingWelcome] = useState<string | null>(null)
  const [notification, setNotification] = useState({ type: "", text: "" })

  const [newRecipient, setNewRecipient] = useState({
    name: "",
    phone: "",
  })

  const [messageForm, setMessageForm] = useState({
    content: "",
    type: "manual",
  })

  useEffect(() => {
    if (user) {
      fetchRecipients()
      fetchMessages()
    }
  }, [user])

  const fetchRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from("sms_recipients")
        .select("*")
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setRecipients(data || [])
    } catch (error) {
      console.error("Error fetching recipients:", error)
    }
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("sms_messages")
        .select("*")
        .eq("sent_by", user?.id)
        .order("sent_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setAddingRecipient(true)
    setNotification({ type: "", text: "" })

    try {
      // Add recipient to database
      const { data, error } = await supabase
        .from("sms_recipients")
        .insert({
          name: newRecipient.name,
          phone: newRecipient.phone,
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      // Send welcome message via Arkesel
      setSendingWelcome(data.id)

      try {
        // Generate AI welcome message
        const welcomeMessage = await generateWelcomeMessage(newRecipient.name, "CyberWatch", "Security", "System")

        // Send SMS via Arkesel
        const smsResult = await sendWelcomeSms(newRecipient.name, newRecipient.phone)

        if (smsResult.success) {
          // Log welcome message in database
          await supabase.from("sms_messages").insert({
            message_content: welcomeMessage,
            message_type: "welcome",
            recipients_count: 1,
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_by: user.id,
          })

          setNotification({
            type: "success",
            text: `✅ ${newRecipient.name} added and welcome SMS sent via ${smsResult.provider}! Message ID: ${smsResult.messageId}`,
          })
        } else {
          setNotification({
            type: "warning",
            text: `✅ ${newRecipient.name} added but Arkesel SMS failed: ${smsResult.error}`,
          })
        }
      } catch (smsError) {
        console.error("Welcome SMS failed:", smsError)
        setNotification({
          type: "warning",
          text: `✅ ${newRecipient.name} added but welcome SMS failed. Check Arkesel configuration.`,
        })
      }

      // Reset form and refresh data
      setNewRecipient({ name: "", phone: "" })
      fetchRecipients()
      fetchMessages()
    } catch (error) {
      console.error("Error adding recipient:", error)
      setNotification({ type: "error", text: "Failed to add recipient" })
    } finally {
      setAddingRecipient(false)
      setSendingWelcome(null)
    }
  }

  const handleDeleteRecipient = async (id: string) => {
    try {
      const { error } = await supabase.from("sms_recipients").delete().eq("id", id)

      if (error) throw error

      setNotification({ type: "success", text: "Recipient deleted successfully" })
      fetchRecipients()
    } catch (error) {
      console.error("Error deleting recipient:", error)
      setNotification({ type: "error", text: "Failed to delete recipient" })
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || recipients.length === 0) return

    setSendingMessage(true)
    setNotification({ type: "", text: "" })

    try {
      const activeRecipients = recipients.filter((r) => r.is_active)
      const phoneNumbers = activeRecipients.map((r) => r.phone)

      // Send bulk SMS via Arkesel
      const bulkResult = await sendBulkSms(phoneNumbers, messageForm.content)

      // Log message in database
      await supabase.from("sms_messages").insert({
        message_content: messageForm.content,
        message_type: messageForm.type,
        recipients_count: activeRecipients.length,
        status: bulkResult.success > 0 ? "sent" : "failed",
        sent_at: new Date().toISOString(),
        sent_by: user.id,
      })

      setNotification({
        type: "success",
        text: `📱 Message sent via Arkesel! Success: ${bulkResult.success}, Failed: ${bulkResult.failed}`,
      })

      setMessageForm({ content: "", type: "manual" })
      fetchMessages()
    } catch (error) {
      console.error("Error sending message:", error)
      setNotification({ type: "error", text: "Failed to send message via Arkesel" })
    } finally {
      setSendingMessage(false)
    }
  }

  const generateAIMessage = async () => {
    try {
      const aiMessage = await generateDetectionAlert("ABC-123", "Main Gate", 95)
      setMessageForm((prev) => ({ ...prev, content: aiMessage }))
    } catch (error) {
      console.error("Error generating AI message:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-cyan-400">Loading SMS dashboard...</div>
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                SMS Notifications
              </h1>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                  <Zap className="h-3 w-3 mr-1" />
                  {smsService.getProviderName()}
                </Badge>
                <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                  <Users className="h-3 w-3 mr-1" />
                  {recipients.filter((r) => r.is_active).length} Active
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Notification */}
          {notification.text && (
            <div
              className={`mb-6 flex items-center space-x-2 p-4 rounded-lg border ${
                notification.type === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : notification.type === "warning"
                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                    : "bg-green-500/10 border-green-500/30 text-green-400"
              }`}
            >
              {notification.type === "error" ? (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recipients Management */}
            <div className="space-y-6">
              {/* Add Recipient */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Add SMS Recipient
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Add new recipients for SMS notifications. They'll get a welcome message via Arkesel!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddRecipient} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-300">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={newRecipient.name}
                        onChange={(e) => setNewRecipient((prev) => ({ ...prev, name: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                        required
                        disabled={addingRecipient}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">
                        Phone Number (for Arkesel SMS)
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="0241234567 or +233241234567"
                        value={newRecipient.phone}
                        onChange={(e) => setNewRecipient((prev) => ({ ...prev, phone: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                        required
                        disabled={addingRecipient}
                      />
                      <p className="text-xs text-gray-500">📱 Will receive welcome SMS via Arkesel</p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                      disabled={addingRecipient}
                    >
                      {addingRecipient ? (
                        <>
                          <Heart className="h-4 w-4 mr-2 animate-pulse" />
                          Adding & Sending Welcome...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Recipient
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Recipients List */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    SMS Recipients ({recipients.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recipients.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No recipients added yet</p>
                    ) : (
                      recipients.map((recipient) => (
                        <div
                          key={recipient.id}
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="text-white font-medium">{recipient.name}</p>
                              <p className="text-gray-400 text-sm">{recipient.phone}</p>
                            </div>
                            {sendingWelcome === recipient.id && (
                              <Heart className="h-4 w-4 text-purple-400 animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={recipient.is_active ? "default" : "secondary"}
                              className={recipient.is_active ? "bg-green-500/20 text-green-400" : ""}
                            >
                              {recipient.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecipient(recipient.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Message Sending */}
            <div className="space-y-6">
              {/* Send Message */}
              <Card className="bg-gray-900/50 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-purple-400 flex items-center">
                    <Send className="mr-2 h-5 w-5" />
                    Send SMS via Arkesel
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Send messages to all active recipients using Arkesel SMS service
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-gray-300">
                        Message Content
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Enter your message here..."
                        value={messageForm.content}
                        onChange={(e) => setMessageForm((prev) => ({ ...prev, content: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500 min-h-[120px]"
                        required
                        disabled={sendingMessage}
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{messageForm.content.length} characters</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateAIMessage}
                          className="text-purple-400 hover:text-purple-300 p-0 h-auto"
                        >
                          Generate AI Message
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      disabled={sendingMessage || recipients.filter((r) => r.is_active).length === 0}
                    >
                      {sendingMessage ? (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2 animate-pulse" />
                          Sending via Arkesel...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send to {recipients.filter((r) => r.is_active).length} Recipients
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Recent Messages */}
              <Card className="bg-gray-900/50 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-purple-400 flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Recent Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No messages sent yet</p>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="flex items-start justify-between mb-2">
                            <Badge
                              variant="outline"
                              className={
                                message.message_type === "welcome"
                                  ? "border-purple-500/30 text-purple-400"
                                  : message.message_type === "car_registration"
                                    ? "border-cyan-500/30 text-cyan-400"
                                    : "border-gray-500/30 text-gray-400"
                              }
                            >
                              {message.message_type === "welcome" && <Heart className="h-3 w-3 mr-1" />}
                              {message.message_type}
                            </Badge>
                            <span className="text-xs text-gray-500">{new Date(message.sent_at).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2">
                            {message.message_content.substring(0, 100)}
                            {message.message_content.length > 100 && "..."}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{message.recipients_count} recipients</span>
                            <Badge
                              variant={message.status === "sent" ? "default" : "destructive"}
                              className={message.status === "sent" ? "bg-green-500/20 text-green-400" : ""}
                            >
                              {message.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
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
