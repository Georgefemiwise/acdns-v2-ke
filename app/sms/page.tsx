"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, Users, Plus, Trash2, CheckCircle, AlertCircle, Heart, Zap, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { sendWelcomeSms, sendBulkSms } from "@/lib/sms-service"
import { generateRecipientWelcomeMessage, aiSmsGenerator } from "@/lib/ai-sms-generator"

interface SmsRecipient {
  id: string
  name: string
  phone: string
  status: "active" | "inactive"
  created_at: string
}

interface SmsMessage {
  id: string
  message_content: string
  message_type: string
  recipients_count: number
  status: string
  sent_at: string
}

export default function SmsPage() {
  const { user } = useAuth()
  const [recipients, setRecipients] = useState<SmsRecipient[]>([])
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [addingRecipient, setAddingRecipient] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  const [newRecipient, setNewRecipient] = useState({
    name: "",
    phone: "",
  })

  const [bulkMessage, setBulkMessage] = useState("")

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      // Load SMS recipients
      const { data: recipientsData, error: recipientsError } = await supabase
        .from("sms_recipients")
        .select("*")
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false })

      if (recipientsError) throw recipientsError
      setRecipients(recipientsData || [])

      // Load SMS messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("sms_messages")
        .select("*")
        .eq("sent_by", user?.id)
        .order("sent_at", { ascending: false })
        .limit(10)

      if (messagesError) throw messagesError
      setMessages(messagesData || [])
    } catch (error) {
      console.error("Error loading SMS data:", error)
      setMessage({ type: "error", text: "Failed to load SMS data" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setMessage({ type: "error", text: "Please log in to add recipients" })
      return
    }

    setAddingRecipient(true)
    setMessage({ type: "", text: "" })

    try {
      // Add recipient to database
      const { data: recipientData, error: recipientError } = await supabase
        .from("sms_recipients")
        .insert({
          name: newRecipient.name,
          phone: newRecipient.phone,
          status: "active",
          created_by: user.id,
        })
        .select()
        .single()

      if (recipientError) {
        if (recipientError.code === "23505") {
          setMessage({ type: "error", text: "A recipient with this phone number already exists" })
        } else {
          setMessage({ type: "error", text: `Failed to add recipient: ${recipientError.message}` })
        }
        return
      }

      // Generate and send welcome message
      try {
        const welcomeMessage = await generateRecipientWelcomeMessage(newRecipient.name)
        const smsResult = await sendWelcomeSms(newRecipient.name, newRecipient.phone)

        if (smsResult.success) {
          // Log welcome SMS in database
          await supabase.from("sms_messages").insert({
            message_content: welcomeMessage,
            message_type: "welcome",
            recipients_count: 1,
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_by: user.id,
          })

          const messageGenType = aiSmsGenerator.isAiAvailable() ? "AI-generated" : "template-based"
          setMessage({
            type: "success",
            text: `✨ ${newRecipient.name} added successfully and ${messageGenType} welcome SMS sent via ${smsResult.provider}! "${welcomeMessage.substring(0, 50)}..."`,
          })
        } else {
          setMessage({
            type: "success",
            text: `Recipient added successfully! Welcome SMS failed: ${smsResult.error}`,
          })
        }
      } catch (smsError) {
        console.error("Welcome SMS failed:", smsError)
        setMessage({
          type: "success",
          text: "Recipient added successfully! Welcome SMS sending failed.",
        })
      }

      // Reset form and reload data
      setNewRecipient({ name: "", phone: "" })
      await loadData()
    } catch (error) {
      console.error("Error adding recipient:", error)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setAddingRecipient(false)
    }
  }

  const handleDeleteRecipient = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return

    try {
      const { error } = await supabase.from("sms_recipients").delete().eq("id", id)

      if (error) throw error

      setMessage({ type: "success", text: `${name} removed successfully` })
      await loadData()
    } catch (error) {
      console.error("Error deleting recipient:", error)
      setMessage({ type: "error", text: "Failed to delete recipient" })
    }
  }

  const handleSendBulkMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bulkMessage.trim()) {
      setMessage({ type: "error", text: "Please enter a message to send" })
      return
    }

    if (recipients.length === 0) {
      setMessage({ type: "error", text: "No recipients available. Add some recipients first." })
      return
    }

    setSending(true)
    setMessage({ type: "", text: "" })

    try {
      const activeRecipients = recipients.filter((r) => r.status === "active")
      const phoneNumbers = activeRecipients.map((r) => r.phone)

      const bulkResult = await sendBulkSms(phoneNumbers, bulkMessage)

      // Log bulk SMS in database
      await supabase.from("sms_messages").insert({
        message_content: bulkMessage,
        message_type: "bulk",
        recipients_count: activeRecipients.length,
        status: bulkResult.success > 0 ? "sent" : "failed",
        sent_at: new Date().toISOString(),
        sent_by: user?.id,
      })

      setMessage({
        type: "success",
        text: `📱 Bulk SMS sent! Success: ${bulkResult.success}, Failed: ${bulkResult.failed}`,
      })

      setBulkMessage("")
      await loadData()
    } catch (error) {
      console.error("Error sending bulk SMS:", error)
      setMessage({ type: "error", text: "Failed to send bulk SMS" })
    } finally {
      setSending(false)
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
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  SMS Management
                </h1>
                <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {recipients.length} Recipients
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded flex items-center">
                  {aiSmsGenerator.isAiAvailable() ? (
                    <>
                      <Zap className="h-3 w-3 mr-1 text-yellow-400" />
                      AI Messages
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 mr-1 text-blue-400" />
                      Template Messages
                    </>
                  )}
                </span>
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

          {/* AI Status Info */}
          {!aiSmsGenerator.isAiAvailable() && (
            <div className="mb-6 flex items-center space-x-2 p-4 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-400">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span>
                Using template-based SMS messages. Add OPENAI_API_KEY environment variable to enable AI-generated
                messages.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recipients Management */}
            <div className="space-y-6">
              {/* Add Recipient */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Add SMS Recipient
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Add new recipients to receive SMS notifications. They'll get an automatic{" "}
                    {aiSmsGenerator.isAiAvailable() ? "AI-generated" : "template-based"} welcome message!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddRecipient} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientName" className="text-gray-300">
                        Full Name *
                      </Label>
                      <Input
                        id="recipientName"
                        placeholder="John Doe"
                        value={newRecipient.name}
                        onChange={(e) => setNewRecipient((prev) => ({ ...prev, name: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                        required
                        disabled={addingRecipient}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recipientPhone" className="text-gray-300">
                        Phone Number *
                      </Label>
                      <Input
                        id="recipientPhone"
                        type="tel"
                        placeholder="0241234567 or +233241234567"
                        value={newRecipient.phone}
                        onChange={(e) => setNewRecipient((prev) => ({ ...prev, phone: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                        required
                        disabled={addingRecipient}
                      />
                      <p className="text-xs text-gray-500">
                        📱 Will receive automatic {aiSmsGenerator.isAiAvailable() ? "AI-generated" : "template-based"}{" "}
                        welcome message via Arkesel
                      </p>
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
                          <Plus className="h-4 w-4 mr-2" />
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
                  {recipients.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No recipients added yet</p>
                  ) : (
                    <div className="space-y-3">
                      {recipients.map((recipient) => (
                        <div
                          key={recipient.id}
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                        >
                          <div>
                            <p className="text-white font-medium">{recipient.name}</p>
                            <p className="text-gray-400 text-sm">{recipient.phone}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={recipient.status === "active" ? "default" : "secondary"}
                              className={
                                recipient.status === "active"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              }
                            >
                              {recipient.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecipient(recipient.id, recipient.name)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bulk SMS & Message History */}
            <div className="space-y-6">
              {/* Send Bulk SMS */}
              <Card className="bg-gray-900/50 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-purple-400 flex items-center">
                    <Send className="mr-2 h-5 w-5" />
                    Send Bulk SMS
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Send a message to all active recipients ({recipients.filter((r) => r.status === "active").length}{" "}
                    recipients)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendBulkMessage} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulkMessage" className="text-gray-300">
                        Message Content *
                      </Label>
                      <Textarea
                        id="bulkMessage"
                        placeholder="Enter your message here..."
                        value={bulkMessage}
                        onChange={(e) => setBulkMessage(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500 min-h-[120px]"
                        required
                        disabled={sending}
                      />
                      <p className="text-xs text-gray-500">
                        Character count: {bulkMessage.length}/160 ({Math.ceil(bulkMessage.length / 160) || 1} SMS
                        {Math.ceil(bulkMessage.length / 160) > 1 ? "s" : ""})
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      disabled={sending || recipients.filter((r) => r.status === "active").length === 0}
                    >
                      {sending ? (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2 animate-pulse" />
                          Sending via Arkesel...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send to {recipients.filter((r) => r.status === "active").length} Recipients
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Message History */}
              <Card className="bg-gray-900/50 border-gray-500/30">
                <CardHeader>
                  <CardTitle className="text-gray-400 flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Recent Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No messages sent yet</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div key={msg.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant="outline"
                              className={
                                msg.message_type === "welcome"
                                  ? "border-purple-500/50 text-purple-400"
                                  : msg.message_type === "car_registration"
                                    ? "border-cyan-500/50 text-cyan-400"
                                    : "border-gray-500/50 text-gray-400"
                              }
                            >
                              {msg.message_type === "welcome" && <Heart className="h-3 w-3 mr-1" />}
                              {msg.message_type}
                            </Badge>
                            <span className="text-xs text-gray-500">{new Date(msg.sent_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2">
                            {msg.message_content.length > 100
                              ? `${msg.message_content.substring(0, 100)}...`
                              : msg.message_content}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{msg.recipients_count} recipient(s)</span>
                            <Badge
                              variant={msg.status === "sent" ? "default" : "destructive"}
                              className={
                                msg.status === "sent"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border-red-500/30"
                              }
                            >
                              {msg.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
