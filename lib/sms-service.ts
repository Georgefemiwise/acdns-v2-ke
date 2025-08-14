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

interface BulkSmsResult {
  success: number
  failed: number
  results: SmsResult[]
}

// Arkesel SMS Provider
export const arkeselProvider = {
  name: "Arkesel",
  apiUrl: "https://sms.arkesel.com/api/v2/sms/send",
  available: !!(process.env.ARKESEL_API_KEY && process.env.ARKESEL_SENDER_ID),
}

// Twilio SMS Provider (backup)
const twilioProvider = {
  name: "Twilio",
  available: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
}

// Mock SMS Provider for development
const mockProvider = {
  name: "Mock SMS (Development)",
  available: true,
}

// SMS Service Manager
class SmsService {
  private providers = {
    arkesel: arkeselProvider,
    twilio: twilioProvider,
    mock: mockProvider,
  };

  constructor() {
    console.log("📱 SMS Service initialized");
    console.log("Available providers:", this.getAvailableProviders());
  }

  /**  

   * Get list of available SMS providers
   */
  getAvailableProviders(): string[] {
    return Object.entries(this.providers)
      .filter(([_, config]) => config.available)
      .map(([_, config]) => config.name);
  }

  /**
   * Get the primary provider name
   */
  getProviderName(): string {
    if (this.providers.arkesel.available) return this.providers.arkesel.name;
    if (this.providers.twilio.available) return this.providers.twilio.name;
    return this.providers.mock.name;
  }

  /**
   * Send SMS using the best available provider
   */
  async sendSms(to: string, message: string): Promise<SmsResult> {
    const cleanPhone = this.cleanPhoneNumber(to);

    // Try Arkesel first (primary provider)
    if (this.providers.arkesel.available) {
      try {
        return await this.sendViaArkesel(cleanPhone, message);
      } catch (error) {
        console.error("Arkesel SMS failed:", error);
      }
    }

    // Try Twilio as fallback
    if (this.providers.twilio.available) {
      try {
        return await this.sendViaTwilio(cleanPhone, message);
      } catch (error) {
        console.error("Twilio SMS failed:", error);
      }
    }

    // Use mock service for development
    return this.sendViaMock(cleanPhone, message);
  }

  /**
   * Send SMS via Arkesel
   */
  private async sendViaArkesel(
    to: string,
    message: string
  ): Promise<SmsResult> {
    const apiKey = process.env.ARKESEL_API_KEY;
    const senderId = process.env.ARKESEL_SENDER_ID || "CyberWatch";

    const response = await fetch(this.providers.arkesel.apiUrl, {
      method: "POST",
      headers: {
        "api-key": apiKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: senderId,
        message: message,
        recipients: [to],
        // sandbox: process.env.NODE_ENV === "development",
      }),
    });

    const result = await response.json();
    
if (response.ok && (result.code === "ok" || result.status === "success")) {
  return {
    success: true,
    messageId: result.data?.[0]?.id || `arkesel_${Date.now()}`,
    provider: "Arkesel",
  };
} else {
  throw new Error(result.message || "Arkesel SMS failed");
}

  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(to: string, message: string): Promise<SmsResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${authToken}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber!,
          To: to,
          Body: message,
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageId: result.sid,
        provider: "Twilio",
      };
    } else {
      throw new Error(result.message || "Twilio SMS failed");
    }
  }

  /**
   * Mock SMS service for development
   */
  private async sendViaMock(to: string, message: string): Promise<SmsResult> {
    console.log("📱 MOCK SMS SENT:");
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    console.log("---");

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      provider: "Mock SMS (Development)",
    };
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSms(
    phoneNumbers: string[],
    message: string
  ): Promise<BulkSmsResult> {
    const results: SmsResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const phone of phoneNumbers) {
      try {
        const result = await this.sendSms(phone, message);
        results.push(result);
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          provider: this.getProviderName(),
        });
        failedCount++;
      }

      // Small delay between messages to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * Clean and format phone number
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, "");

    // Handle Ghana phone numbers
    if (cleaned.startsWith("0") && cleaned.length === 10) {
      // Convert 0241234567 to +233241234567
      cleaned = "233" + cleaned.substring(1);
    } else if (cleaned.startsWith("233") && cleaned.length === 12) {
      // Already in correct format
      cleaned = cleaned;
    } else if (cleaned.length === 9) {
      // Add Ghana country code
      cleaned = "233" + cleaned;
    }

    // Add + prefix if not present
    if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }

    return cleaned;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): {
    isValid: boolean;
    formatted: string;
    error?: string;
  } {
    try {
      const formatted = this.cleanPhoneNumber(phone);

      // Basic validation for Ghana numbers
      if (formatted.startsWith("+233") && formatted.length === 13) {
        return { isValid: true, formatted };
      }

      // International format validation (basic)
      if (
        formatted.startsWith("+") &&
        formatted.length >= 10 &&
        formatted.length <= 15
      ) {
        return { isValid: true, formatted };
      }

      return {
        isValid: false,
        formatted: phone,
        error:
          "Invalid phone number format. Use +233XXXXXXXXX or 0XXXXXXXXX for Ghana numbers.",
      };
    } catch (error) {
      return {
        isValid: false,
        formatted: phone,
        error: "Failed to validate phone number",
      };
    }
  }
}

// Export singleton instance
export const smsService = new SmsService()

// =============================================
// CONVENIENCE FUNCTIONS
// =============================================

/**
 * Send welcome SMS to new car owner
 */
export async function sendCarRegistrationSms(
  ownerName: string,
  phone: string,
  licensePlate: string,
  make: string,
  model: string,
): Promise<SmsResult> {
  const message = `🚗 Hi ${ownerName}! Your ${make} ${model} (${licensePlate}) has been successfully registered with CyberWatch Security System. Welcome aboard! 🎉`

  return await smsService.sendSms(phone, message)
}

/**
 * Send welcome SMS to new SMS recipient
 */
export async function sendWelcomeSms(name: string, phone: string): Promise<SmsResult> {
  const message = `👋 Welcome ${name}! You've been added to CyberWatch SMS notifications. Stay secure! 🔒✨`

  return await smsService.sendSms(phone, message)
}

/**
 * Send bulk SMS to multiple recipients
 */
export async function sendBulkSms(phoneNumbers: string[], message: string): Promise<BulkSmsResult> {
  return await smsService.sendBulkSms(phoneNumbers, message)
}

/**
 * Send detection alert SMS
 */
export async function sendDetectionAlert(
  phoneNumbers: string[],
  licensePlate: string,
  location: string,
  confidence: number,
): Promise<BulkSmsResult> {
  const message = `🚨 Vehicle Alert: ${licensePlate} detected at ${location}. Confidence: ${confidence.toFixed(
    1,
  )}%. Time: ${new Date().toLocaleString()}`

  return await smsService.sendBulkSms(phoneNumbers, message)
}
