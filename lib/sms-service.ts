// =============================================
// SMS SERVICE INTEGRATION
// Supports multiple SMS providers (Twilio, Vonage, etc.)
// =============================================

interface SmsProvider {
  name: string
  send: (to: string, message: string) => Promise<SmsResult>
}

interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
}

// Twilio SMS Provider
class TwilioProvider implements SmsProvider {
  name = "Twilio"

  async send(to: string, message: string): Promise<SmsResult> {
    try {
      // In a real app, you'd use the Twilio SDK
      const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: "YOUR_TWILIO_NUMBER",
          To: to,
          Body: message,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          messageId: data.sid,
          provider: this.name,
        }
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          provider: this.name,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        provider: this.name,
      }
    }
  }
}

// Vonage (Nexmo) SMS Provider
class VonageProvider implements SmsProvider {
  name = "Vonage"

  async send(to: string, message: string): Promise<SmsResult> {
    try {
      const response = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "CyberWatch",
          to: to.replace("+", ""),
          text: message,
          api_key: "YOUR_VONAGE_API_KEY",
          api_secret: "YOUR_VONAGE_API_SECRET",
        }),
      })

      const data = await response.json()

      if (data.messages && data.messages[0].status === "0") {
        return {
          success: true,
          messageId: data.messages[0]["message-id"],
          provider: this.name,
        }
      } else {
        return {
          success: false,
          error: data.messages?.[0]?.["error-text"] || "Unknown error",
          provider: this.name,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        provider: this.name,
      }
    }
  }
}

// Mock SMS Provider for development
class MockSmsProvider implements SmsProvider {
  name = "Mock SMS"

  async send(to: string, message: string): Promise<SmsResult> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log(`📱 SMS sent to ${to}: ${message}`)

    // Simulate 95% success rate
    const success = Math.random() > 0.05

    return {
      success,
      messageId: success ? `mock_${Date.now()}` : undefined,
      error: success ? undefined : "Mock SMS failure",
      provider: this.name,
    }
  }
}

// SMS Service Manager
class SmsService {
  private provider: SmsProvider

  constructor() {
    // Choose provider based on environment
    if (process.env.NODE_ENV === "production") {
      // Use real SMS provider in production
      if (process.env.TWILIO_ACCOUNT_SID) {
        this.provider = new TwilioProvider()
      } else if (process.env.VONAGE_API_KEY) {
        this.provider = new VonageProvider()
      } else {
        this.provider = new MockSmsProvider()
      }
    } else {
      // Use mock provider in development
      this.provider = new MockSmsProvider()
    }
  }

  async sendSms(to: string, message: string): Promise<SmsResult> {
    // Clean phone number
    const cleanPhone = this.cleanPhoneNumber(to)

    if (!this.isValidPhoneNumber(cleanPhone)) {
      return {
        success: false,
        error: "Invalid phone number format",
        provider: this.provider.name,
      }
    }

    return await this.provider.send(cleanPhone, message)
  }

  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, "")

    // Add + if not present and number looks international
    if (!cleaned.startsWith("+") && cleaned.length > 10) {
      cleaned = "+" + cleaned
    }

    return cleaned
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    return phoneRegex.test(phone)
  }

  getProviderName(): string {
    return this.provider.name
  }
}

// Export singleton instance
export const smsService = new SmsService()

// Utility functions
export async function sendCarRegistrationSms(
  ownerName: string,
  ownerPhone: string,
  licensePlate: string,
  make: string,
  model: string,
): Promise<SmsResult> {
  const message = `🚗 Hi ${ownerName}! Your ${make} ${model} (${licensePlate}) has been successfully registered with CyberWatch Security System. Welcome aboard! 🎉`

  return await smsService.sendSms(ownerPhone, message)
}

export async function sendWelcomeSms(recipientName: string, recipientPhone: string): Promise<SmsResult> {
  const message = `👋 Welcome ${recipientName}! You've been added to CyberWatch SMS notifications. Stay secure! 🔒✨`

  return await smsService.sendSms(recipientPhone, message)
}

export async function sendDetectionAlert(
  recipientPhone: string,
  licensePlate: string,
  location: string,
  confidence: number,
): Promise<SmsResult> {
  const message = `🚨 ALERT: Vehicle ${licensePlate} detected at ${location} with ${confidence}% confidence. Time: ${new Date().toLocaleString()}`

  return await smsService.sendSms(recipientPhone, message)
}
