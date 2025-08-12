"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { Eye, EyeOff, Zap, AlertCircle, CheckCircle, Database, ExternalLink } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signIn, signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false)

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  })

  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
    role: "operator",
  })

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 6
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // Validation
    if (!validateEmail(loginForm.email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    if (!validatePassword(loginForm.password)) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    const { error } = await signIn(loginForm.email, loginForm.password)

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.")
      } else if (error.message.includes("Email not confirmed")) {
        setError("Please check your email and click the confirmation link.")
      } else {
        setError(error.message)
      }
    } else {
      setSuccess("Login successful! Welcome back.")
      setTimeout(() => {
        onClose()
        onSuccess?.()
      }, 1000)
    }

    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // Validation
    if (!validateEmail(signupForm.email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    if (!validatePassword(signupForm.password)) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (!signupForm.firstName.trim() || !signupForm.lastName.trim()) {
      setError("First name and last name are required")
      setLoading(false)
      return
    }

    const userData = {
      firstName: signupForm.firstName.trim(),
      lastName: signupForm.lastName.trim(),
      phone: signupForm.phone.trim(),
      department: signupForm.department,
      role: signupForm.role,
    }

    const { error } = await signUp(signupForm.email, signupForm.password, userData)

    if (error) {
      if (error.message.includes("User already registered")) {
        setError("An account with this email already exists. Please sign in instead.")
      } else if (error.message.includes("Password should be at least 6 characters")) {
        setError("Password must be at least 6 characters long")
      } else if (
        error.message.includes("violates row-level security policy") ||
        error.message.includes("permission denied")
      ) {
        setError("Database setup required. Please run the RLS policy setup script first.")
        setShowDatabaseSetup(true)
      } else {
        setError(error.message)
      }
    } else {
      setSuccess("Account created successfully! Please check your email to confirm your account.")
      // Reset form
      setSignupForm({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        phone: "",
        department: "",
        role: "operator",
      })
    }

    setLoading(false)
  }

  const resetForms = () => {
    setLoginForm({ email: "", password: "" })
    setSignupForm({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phone: "",
      department: "",
      role: "operator",
    })
    setError("")
    setSuccess("")
    setShowPassword(false)
    setShowConfirmPassword(false)
    setShowDatabaseSetup(false)
  }

  const handleClose = () => {
    resetForms()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="auth-modal max-w-md bg-gray-900/95 border-cyan-500/30 text-white">
        <DialogHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Zap className="h-8 w-8 text-cyan-400" />
            <DialogTitle className="text-2xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              CyberWatch
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            Authentication required to access this feature
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded p-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded p-3">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {showDatabaseSetup && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Database className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 font-medium">Database Setup Required</span>
            </div>
            <p className="text-sm text-gray-300 mb-3">
              The database RLS policies need to be updated. Please run the fix-rls-policies.sql script in your Supabase
              SQL Editor.
            </p>
            <div className="flex space-x-2">
              <Button
                onClick={() => window.open("https://supabase.com/dashboard/project/_/sql", "_blank")}
                size="sm"
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open SQL Editor
              </Button>
              <Button
                onClick={() => setShowDatabaseSetup(false)}
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              onClick={() => {
                setError("")
                setSuccess("")
                setShowDatabaseSetup(false)
              }}
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              onClick={() => {
                setError("")
                setSuccess("")
                setShowDatabaseSetup(false)
              }}
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-gray-300">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="admin@cyberwatch.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500 pr-10"
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-cyan-400"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !loginForm.email || !loginForm.password}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-firstName" className="text-gray-300">
                    First Name *
                  </Label>
                  <Input
                    id="signup-firstName"
                    placeholder="John"
                    value={signupForm.firstName}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-lastName" className="text-gray-300">
                    Last Name *
                  </Label>
                  <Input
                    id="signup-lastName"
                    placeholder="Doe"
                    value={signupForm.lastName}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-gray-300">
                  Email *
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="john.doe@company.com"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-phone" className="text-gray-300">
                  Phone Number
                </Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="+1-555-0123"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-department" className="text-gray-300">
                    Department
                  </Label>
                  <Select
                    value={signupForm.department}
                    onValueChange={(value) => setSignupForm((prev) => ({ ...prev, department: value }))}
                    disabled={loading}
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role" className="text-gray-300">
                    Role
                  </Label>
                  <Select
                    value={signupForm.role}
                    onValueChange={(value) => setSignupForm((prev) => ({ ...prev, role: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-gray-300">
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password (min 6 characters)"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500 pr-10"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-cyan-400"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirmPassword" className="text-gray-300">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Input
                    id="signup-confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-cyan-500 pr-10"
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-cyan-400"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  loading || !signupForm.email || !signupForm.password || !signupForm.firstName || !signupForm.lastName
                }
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
