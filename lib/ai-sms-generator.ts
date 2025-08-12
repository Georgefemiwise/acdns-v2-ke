// =============================================
// AI SMS MESSAGE GENERATOR
// Uses Hugging Face open-source models for SMS generation
// Falls back to templates if AI is not available
// =============================================

export interface SmsPlaceholders {
  vehicleLicense?: string
  vehicleMake?: string
  vehicleModel?: string
  ownerName?: string
  ownerPhone?: string
  cameraName?: string
  cameraLocation?: string
  detectionTime?: string
  confidenceScore?: string
  systemName?: string
  operatorName?: string
}

export interface SmsGenerationOptions {
  messageType: "detection" | "alert" | "welcome" | "reminder" | "system"
  tone: "professional" | "friendly" | "urgent" | "casual"
  length: "short" | "medium" | "long"
  includeEmoji: boolean
  placeholders: SmsPlaceholders
}

export interface GeneratedSmsMessage {
  message: string
  placeholders: SmsPlaceholders
  estimatedLength: number
  tone: string
  messageType: string
  generatedBy: "ai" | "template"
}

// Predefined message templates for different scenarios
const MESSAGE_TEMPLATES = {
  detection: {
    professional:
      "Vehicle detection alert: {vehicleLicense} detected at {cameraLocation} on {detectionTime}. Confidence: {confidenceScore}%. Contact security if unauthorized.",
    friendly: "Hi! We spotted vehicle {vehicleLicense} at {cameraLocation} just now. Everything looks good! 🚗",
    urgent:
      "🚨 URGENT: Unauthorized vehicle {vehicleLicense} detected at {cameraLocation}. Immediate attention required!",
    casual: "Hey! {vehicleLicense} just rolled through {cameraLocation}. All good! 👍",
  },
  alert: {
    professional:
      "Security Alert: {vehicleLicense} ({vehicleMake} {vehicleModel}) requires attention at {cameraLocation}. Please investigate.",
    friendly: "Heads up! {ownerName}'s {vehicleMake} {vehicleModel} needs some attention at {cameraLocation}. 🔍",
    urgent: "🚨 CRITICAL ALERT: {vehicleLicense} flagged for immediate response at {cameraLocation}!",
    casual: "Alert! {vehicleLicense} needs a quick check at {cameraLocation}. NBD! 😊",
  },
  welcome: {
    professional: "Welcome to CyberWatch, {ownerName}. Your vehicle {vehicleLicense} has been registered successfully.",
    friendly: "Welcome aboard, {ownerName}! 🎉 Your {vehicleMake} {vehicleModel} is now in our system. Drive safe!",
    urgent: "IMPORTANT: {ownerName}, your vehicle registration for {vehicleLicense} is now active.",
    casual: "Hey {ownerName}! Your ride {vehicleLicense} is all set up. Welcome to the family! 🚗✨",
  },
  reminder: {
    professional: "Reminder: Vehicle {vehicleLicense} registration expires soon. Please renew to maintain access.",
    friendly:
      "Hi {ownerName}! Just a friendly reminder that your {vehicleMake} {vehicleModel} registration needs renewal soon. 📅",
    urgent: "⚠️ URGENT: {vehicleLicense} registration expires in 3 days. Renew immediately to avoid access issues.",
    casual: "Yo {ownerName}! Time to renew {vehicleLicense}. Don't let it expire! 🔄",
  },
  system: {
    professional: "System notification: CyberWatch maintenance scheduled. Camera {cameraName} will be offline briefly.",
    friendly: "Quick update! We're doing some maintenance on {cameraName}. Should be back online soon! 🔧",
    urgent: "🚨 SYSTEM ALERT: {cameraName} is currently offline. Technical team notified.",
    casual: "FYI: {cameraName} is taking a little break for maintenance. Back soon! 💤",
  },
}

export class AiSmsGenerator {
  private hasHuggingFaceKey: boolean

  constructor() {
    // Check if Hugging Face API key is available (free tier available)
    this.hasHuggingFaceKey = !!(process.env.HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY)

    if (!this.hasHuggingFaceKey) {
      console.warn("⚠️ Hugging Face API key not found. SMS generator will use template-based messages.")
      console.log("💡 Get a free Hugging Face API key at: https://huggingface.co/settings/tokens")
    } else {
      console.log("🤖 Using Hugging Face open-source AI for SMS generation")
    }
  }

  /**
   * Generate an AI-powered SMS message using Hugging Face API route
   */
  async generateMessage(options: SmsGenerationOptions): Promise<GeneratedSmsMessage> {
    // If no Hugging Face key, fall back to templates immediately
    if (!this.hasHuggingFaceKey) {
      console.log("📝 Using template-based SMS generation (no Hugging Face key)")
      return this.generateTemplateMessage(options)
    }

    try {
      // Call our API route instead of directly calling Hugging Face
      const response = await fetch("/api/generate-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return {
          message: result.message,
          placeholders: options.placeholders,
          estimatedLength: result.message.length,
          tone: options.tone,
          messageType: options.messageType,
          generatedBy: "ai",
        }
      } else {
        throw new Error(result.error || "API generation failed")
      }
    } catch (error) {
      console.error("AI SMS generation failed, falling back to templates:", error)
      return this.generateTemplateMessage(options)
    }
  }

  /**
   * Generate multiple message variations
   */
  async generateVariations(options: SmsGenerationOptions, count = 3): Promise<GeneratedSmsMessage[]> {
    if (!this.hasHuggingFaceKey) {
      // Generate template variations by using different tones
      const tones: Array<"professional" | "friendly" | "urgent" | "casual"> = ["professional", "friendly", "casual"]
      return tones.slice(0, count).map((tone) => this.generateTemplateMessage({ ...options, tone }))
    }

    const variations = await Promise.all(Array.from({ length: count }, () => this.generateMessage(options)))
    return variations
  }

  /**
   * Fallback to template-based message generation
   */
  private generateTemplateMessage(options: SmsGenerationOptions): GeneratedSmsMessage {
    const template =
      MESSAGE_TEMPLATES[options.messageType]?.[options.tone] ||
      MESSAGE_TEMPLATES[options.messageType]?.professional ||
      "System notification: {systemName} alert."

    return {
      message: template,
      placeholders: options.placeholders,
      estimatedLength: template.length,
      tone: options.tone,
      messageType: options.messageType,
      generatedBy: "template",
    }
  }

  /**
   * Replace placeholders in message with actual values
   */
  static replacePlaceholders(message: string, placeholders: SmsPlaceholders): string {
    let result = message

    Object.entries(placeholders).forEach(([key, value]) => {
      if (value) {
        const placeholder = `{${key}}`
        result = result.replace(new RegExp(placeholder, "g"), String(value))
      }
    })

    // Remove any unreplaced placeholders
    result = result.replace(/\{[^}]+\}/g, "[N/A]")

    return result
  }

  /**
   * Validate message length for SMS
   */
  static validateMessageLength(message: string): { isValid: boolean; length: number; segments: number } {
    const length = message.length
    const segments = Math.ceil(length / 160)

    return {
      isValid: length <= 1600, // Max 10 segments
      length,
      segments,
    }
  }

  /**
   * Get message preview with replaced placeholders
   */
  static getMessagePreview(message: string, placeholders: SmsPlaceholders): string {
    return this.replacePlaceholders(message, placeholders)
  }

  /**
   * Check if AI generation is available
   */
  isAiAvailable(): boolean {
    return this.hasHuggingFaceKey
  }

  /**
   * Get the AI provider name
   */
  getProviderName(): string {
    return this.hasHuggingFaceKey ? "Hugging Face (Open Source)" : "Templates"
  }
}

// Export singleton instance
export const aiSmsGenerator = new AiSmsGenerator()

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Generate quick detection alert
 */
export async function generateQuickDetectionAlert(
  licensePlate: string,
  location: string,
  confidence: number,
): Promise<string> {
  const placeholders: SmsPlaceholders = {
    vehicleLicense: licensePlate,
    cameraLocation: location,
    confidenceScore: confidence.toFixed(1),
    detectionTime: new Date().toLocaleString(),
    systemName: "CyberWatch",
  }

  const options: SmsGenerationOptions = {
    messageType: "detection",
    tone: "professional",
    length: "medium",
    includeEmoji: false,
    placeholders,
  }

  const generated = await aiSmsGenerator.generateMessage(options)
  return AiSmsGenerator.replacePlaceholders(generated.message, placeholders)
}

/**
 * Generate welcome message for new vehicle registration
 */
export async function generateWelcomeMessage(
  ownerName: string,
  licensePlate: string,
  vehicleMake: string,
  vehicleModel: string,
): Promise<string> {
  const placeholders: SmsPlaceholders = {
    ownerName,
    vehicleLicense: licensePlate,
    vehicleMake,
    vehicleModel,
    systemName: "CyberWatch",
  }

  const options: SmsGenerationOptions = {
    messageType: "welcome",
    tone: "friendly",
    length: "medium",
    includeEmoji: true,
    placeholders,
  }

  try {
    const generated = await aiSmsGenerator.generateMessage(options)
    const finalMessage = AiSmsGenerator.replacePlaceholders(generated.message, placeholders)

    console.log(`📱 Generated ${generated.generatedBy === "ai" ? "AI" : "template"}-based welcome message`)
    return finalMessage
  } catch (error) {
    console.error("Welcome message generation failed:", error)
    // Ultimate fallback
    return `🚗 Hi ${ownerName}! Your ${vehicleMake} ${vehicleModel} (${licensePlate}) has been successfully registered with CyberWatch Security System. Welcome aboard! 🎉`
  }
}

/**
 * Generate SMS recipient welcome message
 */
export async function generateRecipientWelcomeMessage(recipientName: string): Promise<string> {
  const placeholders: SmsPlaceholders = {
    ownerName: recipientName,
    systemName: "CyberWatch",
  }

  const options: SmsGenerationOptions = {
    messageType: "welcome",
    tone: "friendly",
    length: "short",
    includeEmoji: true,
    placeholders,
  }

  try {
    const generated = await aiSmsGenerator.generateMessage(options)
    const finalMessage = AiSmsGenerator.replacePlaceholders(generated.message, placeholders)

    console.log(`📱 Generated ${generated.generatedBy === "ai" ? "AI" : "template"}-based recipient welcome`)
    return finalMessage
  } catch (error) {
    console.error("Recipient welcome message generation failed:", error)
    // Ultimate fallback
    return `👋 Welcome ${recipientName}! You've been added to CyberWatch SMS notifications. Stay secure with Arkesel! 🔒✨`
  }
}
