"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Car, Search, Plus, ArrowLeft, Edit, Trash2 } from "lucide-react"
import Link from "next/link"

export default function CarsDatabase() {
  const [searchTerm, setSearchTerm] = useState("")

  const cars = [
    {
      id: 1,
      license: "ABC-123",
      make: "Tesla",
      model: "Model 3",
      year: 2023,
      color: "White",
      owner: "John Doe",
      phone: "+1-555-0123",
      email: "john.doe@email.com",
      lastSeen: "2024-01-15 14:30",
      status: "active",
    },
    {
      id: 2,
      license: "XYZ-789",
      make: "BMW",
      model: "X5",
      year: 2022,
      color: "Black",
      owner: "Jane Smith",
      phone: "+1-555-0456",
      email: "jane.smith@email.com",
      lastSeen: "2024-01-15 12:15",
      status: "active",
    },
    {
      id: 3,
      license: "DEF-456",
      make: "Audi",
      model: "A4",
      year: 2021,
      color: "Silver",
      owner: "Mike Johnson",
      phone: "+1-555-0789",
      email: "mike.j@email.com",
      lastSeen: "2024-01-14 16:45",
      status: "inactive",
    },
  ]

  const filteredCars = cars.filter(
    (car) =>
      car.license.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
                  Car Database
                </h1>
              </div>
              <Link href="/cars/register">
                <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Car
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Search and Stats */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by license, owner, or vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
              <div className="flex space-x-4">
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  Total: {cars.length}
                </Badge>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  Active: {cars.filter((c) => c.status === "active").length}
                </Badge>
              </div>
            </div>
          </div>

          {/* Cars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCars.map((car) => (
              <Card
                key={car.id}
                className="bg-gray-900/50 border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-cyan-400 flex items-center">
                      <Car className="mr-2 h-5 w-5" />
                      {car.license}
                    </CardTitle>
                    <Badge
                      variant={car.status === "active" ? "default" : "secondary"}
                      className={
                        car.status === "active"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }
                    >
                      {car.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-400">
                    {car.year} {car.make} {car.model}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Color:</span>
                        <p className="text-white">{car.color}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Year:</span>
                        <p className="text-white">{car.year}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                      <h4 className="text-purple-400 font-medium mb-2">Owner Information</h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-white">{car.owner}</p>
                        <p className="text-gray-400">{car.phone}</p>
                        <p className="text-gray-400">{car.email}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                      <span className="text-gray-400 text-sm">Last Seen:</span>
                      <p className="text-white text-sm">{car.lastSeen}</p>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCars.length === 0 && (
            <div className="text-center py-12">
              <Car className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No cars found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? "Try adjusting your search terms" : "Start by adding your first vehicle"}
              </p>
              <Link href="/cars/register">
                <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Car
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
