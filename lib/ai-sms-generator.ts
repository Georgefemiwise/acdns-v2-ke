import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// =============================================
// AI SMS MESSAGE GENERATOR
// Uses OpenAI to create engaging, personalized SMS messages
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
  private model = openai("gpt-4o-mini")

  /**
   * Generate an AI-powered SMS message with placeholders
   */
  async generateMessage(options: SmsGenerationOptions): Promise<GeneratedSmsMessage> {
    try {
      const prompt = this.buildPrompt(options)

      const { text } = await generateText({
        model: this.model,
        prompt,
        maxTokens: 150,
        temperature: 0.7,
      })

      const processedMessage = this.processGeneratedMessage(text, options.placeholders)

      return {
        message: processedMessage,
        placeholders: options.placeholders,
        estimatedLength: processedMessage.length,
        tone: options.tone,
        messageType: options.messageType,
      }
    } catch (error) {
      console.error("AI SMS generation failed:", error)
      // Fallback to template-based message
      return this.generateTemplateMessage(options)
    }
  }

  /**
   * Generate multiple message variations
   */
  async generateVariations(options: SmsGenerationOptions, count = 3): Promise<GeneratedSmsMessage[]> {
    const variations = await Promise.all(Array.from({ length: count }, () => this.generateMessage(options)))
    return variations
  }

  /**
   * Build AI prompt for message generation
   */
  private buildPrompt(options: SmsGenerationOptions): string {
    const { messageType, tone, length, includeEmoji, placeholders } = options

    const lengthGuide = {
      short: "50-80 characters",
      medium: "80-120 characters",
      long: "120-160 characters",
    }

    const availablePlaceholders = Object.keys(placeholders)
      .filter((key) => placeholders[key as keyof SmsPlaceholders])
      .map((key) => `{${key}}`)
      .join(", ")

    return `Generate a ${tone} SMS message for a ${messageType} notification.

Requirements:
- Length: ${lengthGuide[length]}
- Tone: ${tone}
- ${includeEmoji ? "Include relevant emojis" : "No emojis"}
- Use placeholders where appropriate: ${availablePlaceholders}
- Keep it clear and actionable
- Suitable for security/monitoring context

Context:
${this.buildContextFromPlaceholders(placeholders)}

Generate only the message text with placeholders intact.`
  }

  /**
   * Build context from available placeholders
   */
  private buildContextFromPlaceholders(placeholders: SmsPlaceholders): string {
    const context = []

    if (placeholders.vehicleLicense) {
      context.push(`Vehicle: ${placeholders.vehicleLicense}`)
    }
    if (placeholders.vehicleMake && placeholders.vehicleModel) {
      context.push(`Vehicle type: ${placeholders.vehicleMake} ${placeholders.vehicleModel}`)
    }
    if (placeholders.ownerName) {
      context.push(`Owner: ${placeholders.ownerName}`)
    }
    if (placeholders.cameraLocation) {
      context.push(`Location: ${placeholders.cameraLocation}`)
    }
    if (placeholders.detectionTime) {
      context.push(`Time: ${placeholders.detectionTime}`)
    }

    return context.join("\n")
  }

  /**
   * Process generated message to ensure placeholders are preserved
   */
  private processGeneratedMessage(message: string, placeholders: SmsPlaceholders): string {
    let processed = message.trim()

    // Ensure placeholders are in correct format
    Object.keys(placeholders).forEach((key) => {
      const value = placeholders[key as keyof SmsPlaceholders]
      if (value) {
        // Replace any variations of the placeholder with the standard format
        const variations = [
          new RegExp(`\\b${key}\\b`, "gi"),
          new RegExp(`\\[${key}\\]`, "gi"),
          new RegExp(`\$$${key}\$$`, "gi"),
          new RegExp(`<${key}>`, "gi"),
        ]

        variations.forEach((regex) => {
          processed = processed.replace(regex, `{${key}}`)
        })
      }
    })

    return processed
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

  const generated = await aiSmsGenerator.generateMessage(options)
  return AiSmsGenerator.replacePlaceholders(generated.message, placeholders)
}
