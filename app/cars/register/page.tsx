"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Car, ArrowLeft, Save, CheckCircle, AlertCircle, MessageSquare } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { sendCarRegistrationSms } from "@/lib/sms-service"
import { generateWelcomeMessage } from "@/lib/ai-sms-generator"

export default function RegisterCar() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  const [formData, setFormData] = useState({
    license: "",
    make: "",
    model: "",
    year: "",
    color: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setMessage({ type: "error", text: "Please log in to register a vehicle" })
      return
    }

    setLoading(true)
    setMessage({ type: "", text: "" })

    try {
      // Insert vehicle into database
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .insert({
          license_plate: formData.license.toUpperCase(),
          make: formData.make,
          model: formData.model,
          year: Number.parseInt(formData.year),
          color: formData.color,
          owner_name: formData.ownerName,
          owner_phone: formData.ownerPhone,
          owner_email: formData.ownerEmail,
          notes: formData.notes || null,
          created_by: user.id,
          status: "active",
        })
        .select()
        .single()

      if (vehicleError) {
        if (vehicleError.code === "23505") {
          setMessage({ type: "error", text: "A vehicle with this license plate already exists" })
        } else {
          setMessage({ type: "error", text: `Failed to register vehicle: ${vehicleError.message}` })
        }
        return
      }

      // Vehicle registered successfully, now send SMS
      setSendingSms(true)
      setMessage({ type: "success", text: "Vehicle registered successfully! Sending welcome SMS..." })

      try {
        // Generate AI-powered welcome message for car registration
        const aiWelcomeMessage = await generateWelcomeMessage(
          formData.ownerName,
          formData.license.toUpperCase(),
          formData.make,
          formData.model,
        )

        // Send SMS using the SMS service
        const smsResult = await sendCarRegistrationSms(
          formData.ownerName,
          formData.ownerPhone,
          formData.license.toUpperCase(),
          formData.make,
          formData.model,
        )

        if (smsResult.success) {
          // Log SMS in database
          await supabase.from("sms_messages").insert({
            message_content: aiWelcomeMessage,
            message_type: "car_registration",
            recipients_count: 1,
            status: "sent",
            sent_at: new Date().toISOString(),
            related_vehicle_id: vehicleData?.id,
            sent_by: user.id,
          })

          setMessage({
            type: "success",
            text: `🎉 Vehicle registered and welcome SMS sent to ${formData.ownerName}! Message ID: ${smsResult.messageId}`,
          })
        } else {
          setMessage({
            type: "success",
            text: `Vehicle registered successfully! SMS failed to send: ${smsResult.error}`,
          })
        }
      } catch (smsError) {
        console.error("SMS sending failed:", smsError)
        setMessage({
          type: "success",
          text: "Vehicle registered successfully! SMS sending failed - please check SMS configuration.",
        })
      }

      // Reset form
      setFormData({
        license: "",
        make: "",
        model: "",
        year: "",
        color: "",
        ownerName: "",
        ownerPhone: "",
        ownerEmail: "",
        notes: "",
      })

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push("/cars")
      }, 3000)
    } catch (error) {
      console.error("Error registering vehicle:", error)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setLoading(false)
      setSendingSms(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-cyan-500/30 bg-gray-900/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Link href="/cars">
                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Database
                </Button>
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Register New Vehicle
              </h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
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

            {/* SMS Sending Status */}
            {sendingSms && (
              <div className="mb-6 flex items-center space-x-2 p-4 rounded-lg border bg-purple-500/10 border-purple-500/30 text-purple-400">
                <MessageSquare className="h-4 w-4 flex-shrink-0 animate-pulse" />
                <span>Sending welcome SMS to car owner...</span>
              </div>
            )}

            <Card className="bg-gray-900/50 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center">
                  <Car className="mr-2 h-5 w-5" />
                  Vehicle Information
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Enter the vehicle and owner details. Owner will receive an instant SMS confirmation! 📱
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Vehicle Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-500/30 pb-2">
                      Vehicle Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="license" className="text-gray-300">
                          License Plate *
                        </Label>
                        <Input
                          id="license"
                          placeholder="ABC-123"
                          value={formData.license}
                          onChange={(e) => handleInputChange("license", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="color" className="text-gray-300">
                          Color *
                        </Label>
                        <Select
                          value={formData.color}
                          onValueChange={(value) => handleInputChange("color", value)}
                          disabled={loading}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="white">White</SelectItem>
                            <SelectItem value="black">Black</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="red">Red</SelectItem>
                            <SelectItem value="blue">Blue</SelectItem>
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="yellow">Yellow</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="make" className="text-gray-300">
                          Make *
                        </Label>
                        <Input
                          id="make"
                          placeholder="Tesla"
                          value={formData.make}
                          onChange={(e) => handleInputChange("make", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="model" className="text-gray-300">
                          Model *
                        </Label>
                        <Input
                          id="model"
                          placeholder="Model 3"
                          value={formData.model}
                          onChange={(e) => handleInputChange("model", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="year" className="text-gray-300">
                          Year *
                        </Label>
                        <Input
                          id="year"
                          type="number"
                          placeholder="2023"
                          min="1900"
                          max="2030"
                          value={formData.year}
                          onChange={(e) => handleInputChange("year", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Owner Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-500/30 pb-2">
                      Owner Information
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="ownerName" className="text-gray-300">
                        Full Name *
                      </Label>
                      <Input
                        id="ownerName"
                        placeholder="John Doe"
                        value={formData.ownerName}
                        onChange={(e) => handleInputChange("ownerName", e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ownerPhone" className="text-gray-300">
                          Phone Number * (for SMS confirmation)
                        </Label>
                        <Input
                          id="ownerPhone"
                          type="tel"
                          placeholder="+1-555-0123"
                          value={formData.ownerPhone}
                          onChange={(e) => handleInputChange("ownerPhone", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                          required
                          disabled={loading}
                        />
                        <p className="text-xs text-gray-500">📱 Owner will receive instant SMS confirmation</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ownerEmail" className="text-gray-300">
                          Email Address *
                        </Label>
                        <Input
                          id="ownerEmail"
                          type="email"
                          placeholder="john.doe@email.com"
                          value={formData.ownerEmail}
                          onChange={(e) => handleInputChange("ownerEmail", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-500/30 pb-2">
                      Additional Information
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-gray-300">
                        Notes (Optional)
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional information about the vehicle or owner..."
                        value={formData.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500 min-h-[100px]"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                    <Link href="/cars">
                      <Button
                        variant="outline"
                        className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                        disabled={loading || sendingSms}
                      >
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                      disabled={loading || sendingSms}
                    >
                      {sendingSms ? (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2 animate-pulse" />
                          Sending SMS...
                        </>
                      ) : loading ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Register & Send SMS
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
