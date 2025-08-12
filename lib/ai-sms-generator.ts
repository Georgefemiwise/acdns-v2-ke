import { fetch } from "node-fetch"
import type { SmsPlaceholders } from "./types"

// =============================================
// AI SMS MESSAGE GENERATOR
// Uses Hugging Face open-source models for SMS generation
// Falls back to templates if AI is not available
// =============================================

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
  private huggingFaceApiUrl = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium"

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
   * Generate an AI-powered SMS message using Hugging Face
   */
  async generateMessage(options: SmsGenerationOptions): Promise<GeneratedSmsMessage> {
    // If no Hugging Face key, fall back to templates immediately
    if (!this.hasHuggingFaceKey) {
      console.log("📝 Using template-based SMS generation (no Hugging Face key)")
      return this.generateTemplateMessage(options)
    }

    try {
      const prompt = this.buildPrompt(options)
      const response = await this.callHuggingFaceAPI(prompt)

      if (response && response.length > 0) {
        const generatedText = response[0].generated_text || response[0].text || ""
        const processedMessage = this.processGeneratedMessage(generatedText, options.placeholders, prompt)

        return {
          message: processedMessage,
          placeholders: options.placeholders,
          estimatedLength: processedMessage.length,
          tone: options.tone,
          messageType: options.messageType,
          generatedBy: "ai",
        }
      } else {
        throw new Error("No response from Hugging Face API")
      }
    } catch (error) {
      console.error("Hugging Face AI SMS generation failed, falling back to templates:", error)
      return this.generateTemplateMessage(options)
    }
  }

  /**
   * Call Hugging Face Inference API
   */
  private async callHuggingFaceAPI(prompt: string): Promise<any> {
    const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY

    const response = await fetch(this.huggingFaceApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 160,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9,
        },
        options: {
          wait_for_model: true,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Generate multiple message variations using different models
   */
  async generateVariations(options: SmsGenerationOptions, count = 3): Promise<GeneratedSmsMessage[]> {
    if (!this.hasHuggingFaceKey) {
      // Generate template variations by using different tones
      const tones: Array<"professional" | "friendly" | "urgent" | "casual"> = ["professional", "friendly", "casual"]
      return tones.slice(0, count).map((tone) => this.generateTemplateMessage({ ...options, tone }))
    }

    // Try different Hugging Face models for variety
    const models = ["microsoft/DialoGPT-medium", "facebook/blenderbot-400M-distill", "microsoft/DialoGPT-small"]

    const variations = []
    for (let i = 0; i < Math.min(count, models.length); i++) {
      try {
        this.huggingFaceApiUrl = `https://api-inference.huggingface.co/models/${models[i]}`
        const variation = await this.generateMessage(options)
        variations.push(variation)
      } catch (error) {
        console.error(`Failed to generate variation with model ${models[i]}:`, error)
        // Add template fallback for failed variations
        variations.push(this.generateTemplateMessage(options))
      }
    }

    return variations
  }

  /**
   * Build prompt for AI generation
   */
  private buildPrompt(options: SmsGenerationOptions): string {
    const { messageType, tone, length, includeEmoji, placeholders } = options

    const lengthGuide = {
      short: "under 80 characters",
      medium: "80-120 characters",
      long: "120-160 characters",
    }

    const context = this.buildContextFromPlaceholders(placeholders)

    return `Generate a ${tone} SMS message for ${messageType}. Keep it ${lengthGuide[length]}. ${
      includeEmoji ? "Include emojis." : "No emojis."
    }

Context: ${context}

SMS message:`
  }

  /**
   * Build context from available placeholders
   */
  private buildContextFromPlaceholders(placeholders: SmsPlaceholders): string {
    const context = []

    if (placeholders.ownerName) {
      context.push(`Person: ${placeholders.ownerName}`)
    }
    if (placeholders.vehicleLicense) {
      context.push(`Vehicle: ${placeholders.vehicleLicense}`)
    }
    if (placeholders.vehicleMake && placeholders.vehicleModel) {
      context.push(`Car: ${placeholders.vehicleMake} ${placeholders.vehicleModel}`)
    }
    if (placeholders.cameraLocation) {
      context.push(`Location: ${placeholders.cameraLocation}`)
    }
    if (placeholders.systemName) {
      context.push(`System: ${placeholders.systemName}`)
    }

    return context.join(", ") || "Security system notification"
  }

  /**
   * Process generated message to clean it up
   */
  private processGeneratedMessage(message: string, placeholders: SmsPlaceholders, originalPrompt: string): string {
    let processed = message.trim()

    // Remove the original prompt if it appears in the response
    processed = processed.replace(originalPrompt, "").trim()

    // Clean up common AI artifacts
    processed = processed.replace(/^(SMS message:|Message:|Text:)/i, "").trim()
    processed = processed.replace(/\n+/g, " ").trim()

    // Ensure it's not too long for SMS
    if (processed.length > 160) {
      processed = processed.substring(0, 157) + "..."
    }

    // If the message is too short or doesn't make sense, use template
    if (processed.length < 10 || !this.isValidSmsMessage(processed)) {
      console.log("Generated message too short or invalid, using template fallback")
      return this.generateTemplateMessage({
        messageType: "welcome",
        tone: "friendly",
        length: "medium",
        includeEmoji: true,
        placeholders,
      }).message
    }

    return processed
  }

  /**
   * Validate if generated message makes sense
   */
  private isValidSmsMessage(message: string): boolean {
    // Basic validation - message should have some meaningful content
    const meaningfulWords = ["welcome", "vehicle", "car", "system", "alert", "detected", "registered", "security"]
    const lowerMessage = message.toLowerCase()

    return meaningfulWords.some((word) => lowerMessage.includes(word)) || message.length > 30
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
