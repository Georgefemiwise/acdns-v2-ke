"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User, Session, AuthError } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  department?: string
  role: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData: any) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
  requireAuth: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...")

        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
          if (mounted) {
            setSession(null)
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)

          if (session?.user) {
            await fetchUserProfile(session.user.id)
          } else {
            setLoading(false)
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        if (mounted) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)

      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId)

      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error) {
        console.error("Error fetching user profile:", error)

        // If profile doesn't exist, create a basic one from auth user
        if (error.code === "PGRST116" || error.message.includes("table") || error.message.includes("does not exist")) {
          console.log("Profile not found or table missing, creating basic profile from auth data")

          try {
            // Get user data from auth
            const {
              data: { user },
            } = await supabase.auth.getUser()

            if (user) {
              // Create a basic profile object from auth metadata
              const basicProfile = {
                id: user.id,
                email: user.email || "",
                first_name: user.user_metadata?.first_name || user.email?.split("@")[0] || "User",
                last_name: user.user_metadata?.last_name || "",
                phone: user.user_metadata?.phone || "",
                department: user.user_metadata?.department || "",
                role: "operator",
                avatar_url: user.user_metadata?.avatar_url || "",
                is_active: true,
                created_at: user.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }

              setProfile(basicProfile)
              console.log("Using basic profile from auth metadata")
            } else {
              console.error("No auth user found")
              setProfile(null)
            }
          } catch (authError) {
            console.error("Error getting auth user:", authError)
            setProfile(null)
          }
        } else {
          // Other database errors
          console.error("Database error:", error)
          setProfile(null)
        }
      } else {
        console.log("Profile fetched successfully:", data)
        setProfile(data)
      }
    } catch (error) {
      console.error("Unexpected error fetching user profile:", error)

      // Fallback: create basic profile from auth user
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const fallbackProfile = {
            id: user.id,
            email: user.email || "",
            first_name: user.user_metadata?.first_name || user.email?.split("@")[0] || "User",
            last_name: user.user_metadata?.last_name || "",
            phone: "",
            department: "",
            role: "operator",
            avatar_url: "",
            is_active: true,
            created_at: user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setProfile(fallbackProfile)
          console.log("Using fallback profile")
        } else {
          setProfile(null)
        }
      } catch (fallbackError) {
        console.error("Fallback profile creation failed:", fallbackError)
        setProfile(null)
      }
    } finally {
      // GUARANTEE that loading is set to false
      console.log("Setting loading to false")
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error) {
      // Update last login - but don't fail if it doesn't work
      try {
        await supabase.from("users").update({ last_login: new Date().toISOString() }).eq("email", email)
      } catch (updateError) {
        console.warn("Could not update last login:", updateError)
      }
    }

    return { error }
  }

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      // First, sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
          },
        },
      })

      if (error) {
        return { error }
      }

      if (data.user) {
        // Try to create user profile, but don't fail if table doesn't exist
        try {
          const { error: profileError } = await supabase.from("users").insert({
            id: data.user.id,
            email: data.user.email!,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone || null,
            department: userData.department || null,
            role: userData.role || "operator",
            is_active: true,
          })

          if (profileError) {
            console.error("Error creating user profile:", profileError)
            // Don't return error here - auth was successful even if profile creation failed
          }
        } catch (profileError) {
          console.error("Could not create user profile:", profileError)
          // Continue - the auth signup was successful
        }
      }

      return { error: null }
    } catch (error) {
      console.error("Signup error:", error)
      return { error: error as AuthError }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error("No user logged in") }

    try {
      const { error } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (!error) {
        setProfile((prev) => (prev ? { ...prev, ...updates } : null))
      }

      return { error }
    } catch (error) {
      console.error("Error updating profile:", error)
      return { error }
    }
  }

  const requireAuth = () => {
    return !!user
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    requireAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
