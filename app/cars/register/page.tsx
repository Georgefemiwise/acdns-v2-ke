"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Car, ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function RegisterCar() {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Car registration data:", formData)
    // Redirect or show success message
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
            <Card className="bg-gray-900/50 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center">
                  <Car className="mr-2 h-5 w-5" />
                  Vehicle Information
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Enter the vehicle and owner details for the car detection system
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
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="color" className="text-gray-300">
                          Color *
                        </Label>
                        <Select value={formData.color} onValueChange={(value) => handleInputChange("color", value)}>
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
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ownerPhone" className="text-gray-300">
                          Phone Number *
                        </Label>
                        <Input
                          id="ownerPhone"
                          type="tel"
                          placeholder="+1-555-0123"
                          value={formData.ownerPhone}
                          onChange={(e) => handleInputChange("ownerPhone", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                          required
                        />
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
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                    <Link href="/cars">
                      <Button
                        variant="outline"
                        className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                      >
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Register Vehicle
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
