// =============================================
// SMS SERVICE INTEGRATION
// Supports Arkesel and other SMS providers
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

// Arkesel SMS Provider
class ArkeselProvider implements SmsProvider {
  name = "Arkesel"

  async send(to: string, message: string): Promise<SmsResult> {
    try {
      const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
        method: "POST",
        headers: {
          "api-key": process.env.ARKESEL_API_KEY || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: process.env.ARKESEL_SENDER_ID || "CyberWatch",
          message: message,
          recipients: [to.replace("+", "")], // Arkesel expects array of numbers without +
          sandbox: process.env.NODE_ENV !== "production", // Use sandbox in development
        }),
      })

      const data = await response.json()

      if (response.ok && data.code === "ok") {
        return {
          success: true,
          messageId: data.data?.id || `arkesel_${Date.now()}`,
          provider: this.name,
        }
      } else {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
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

// Twilio SMS Provider (backup)
class TwilioProvider implements SmsProvider {
  name = "Twilio"

  async send(to: string, message: string): Promise<SmsResult> {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: process.env.TWILIO_PHONE_NUMBER || "",
            To: to,
            Body: message,
          }),
        },
      )

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

// Mock SMS Provider for development
class MockSmsProvider implements SmsProvider {
  name = "Mock SMS"

  async send(to: string, message: string): Promise<SmsResult> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log(`📱 [ARKESEL MOCK] SMS sent to ${to}: ${message}`)

    // Simulate 95% success rate
    const success = Math.random() > 0.05

    return {
      success,
      messageId: success ? `mock_arkesel_${Date.now()}` : undefined,
      error: success ? undefined : "Mock Arkesel SMS failure",
      provider: this.name,
    }
  }
}

// SMS Service Manager
class SmsService {
  private provider: SmsProvider

  constructor() {
    // Choose provider based on environment and available credentials
    if (process.env.ARKESEL_API_KEY) {
      // Primary: Use Arkesel if API key is available
      this.provider = new ArkeselProvider()
    } else if (process.env.TWILIO_ACCOUNT_SID) {
      // Fallback: Use Twilio if available
      this.provider = new TwilioProvider()
    } else {
      // Development: Use mock provider
      this.provider = new MockSmsProvider()
    }

    console.log(`📱 SMS Service initialized with provider: ${this.provider.name}`)
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

    console.log(`📱 Sending SMS via ${this.provider.name} to ${cleanPhone}`)
    return await this.provider.send(cleanPhone, message)
  }

  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, "")

    // For Arkesel, we typically need Ghana format
    if (!cleaned.startsWith("+")) {
      // If it starts with 0, replace with +233 (Ghana)
      if (cleaned.startsWith("0")) {
        cleaned = "+233" + cleaned.substring(1)
      }
      // If it's 9 digits, assume it's Ghana without country code
      else if (cleaned.length === 9) {
        cleaned = "+233" + cleaned
      }
      // If it's 10+ digits, add +
      else if (cleaned.length >= 10) {
        cleaned = "+" + cleaned
      }
    }

    return cleaned
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{8,14}$/
    return phoneRegex.test(phone)
  }

  getProviderName(): string {
    return this.provider.name
  }

  isArkeselActive(): boolean {
    return this.provider instanceof ArkeselProvider
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
  const message = `👋 Welcome ${recipientName}! You've been added to CyberWatch SMS notifications. Stay secure with Arkesel! 🔒✨`

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

// Arkesel specific utilities
export async function sendBulkSms(
  recipients: string[],
  message: string,
): Promise<{ success: number; failed: number; results: SmsResult[] }> {
  const results: SmsResult[] = []
  let success = 0
  let failed = 0

  // Send SMS to each recipient
  for (const recipient of recipients) {
    const result = await smsService.sendSms(recipient, message)
    results.push(result)

    if (result.success) {
      success++
    } else {
      failed++
    }

    // Small delay between messages to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { success, failed, results }
}
