import { type NextRequest, NextResponse } from "next/server";
import type { SmsGenerationOptions } from "@/lib/ai-sms-generator";

// =============================================
// HUGGING FACE SMS GENERATION API ROUTE
// Server-side API route for generating SMS messages
// =============================================

const MESSAGE_TEMPLATES = {
  detection: {
    professional:
      "Vehicle detection alert: {vehicleLicense} detected at {cameraLocation} on {detectionTime}. Confidence: {confidenceScore}%. Contact security if unauthorized.",
    friendly:
      "Hi! We spotted vehicle {vehicleLicense} at {cameraLocation} just now. Everything looks good! 🚗",
    urgent:
      "🚨 URGENT: Unauthorized vehicle {vehicleLicense} detected at {cameraLocation}. Immediate attention required!",
    casual:
      "Hey! {vehicleLicense} just rolled through {cameraLocation}. All good! 👍",
  },
  alert: {
    professional:
      "Security Alert: {vehicleLicense} ({vehicleMake} {vehicleModel}) requires attention at {cameraLocation}. Please investigate.",
    friendly:
      "Heads up! {ownerName}'s {vehicleMake} {vehicleModel} needs some attention at {cameraLocation}. 🔍",
    urgent:
      "🚨 CRITICAL ALERT: {vehicleLicense} flagged for immediate response at {cameraLocation}!",
    casual:
      "Alert! {vehicleLicense} needs a quick check at {cameraLocation}. NBD! 😊",
  },
  welcome: {
    professional:
      "Welcome to CyberWatch, {ownerName}. Your vehicle {vehicleLicense} has been registered successfully.",
    friendly:
      "Welcome aboard, {ownerName}! 🎉 Your {vehicleMake} {vehicleModel} is now in our system. Drive safe!",
    urgent:
      "IMPORTANT: {ownerName}, your vehicle registration for {vehicleLicense} is now active.",
    casual:
      "Hey {ownerName}! Your ride {vehicleLicense} is all set up. Welcome to the family! 🚗✨",
  },
  reminder: {
    professional:
      "Reminder: Vehicle {vehicleLicense} registration expires soon. Please renew to maintain access.",
    friendly:
      "Hi {ownerName}! Just a friendly reminder that your {vehicleMake} {vehicleModel} registration needs renewal soon. 📅",
    urgent:
      "⚠️ URGENT: {vehicleLicense} registration expires in 3 days. Renew immediately to avoid access issues.",
    casual:
      "Yo {ownerName}! Time to renew {vehicleLicense}. Don't let it expire! 🔄",
  },
  system: {
    professional:
      "System notification: CyberWatch maintenance scheduled. Camera {cameraName} will be offline briefly.",
    friendly:
      "Quick update! We're doing some maintenance on {cameraName}. Should be back online soon! 🔧",
    urgent:
      "🚨 SYSTEM ALERT: {cameraName} is currently offline. Technical team notified.",
    casual:
      "FYI: {cameraName} is taking a little break for maintenance. Back soon! 💤",
  },
};

async function callHuggingFaceAPI(prompt: string): Promise<any> {
  const apiKey =
    process.env.HUGGINGFACE_API_KEY ||
    process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error("Hugging Face API key not found");
  }

  const response = await fetch(
    "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
    {
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
    }
  );

  if (!response.ok) {
    throw new Error(
      `Hugging Face API error: ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

function buildPrompt(options: SmsGenerationOptions): string {
  const { messageType, tone, length, includeEmoji, placeholders } = options;

  const lengthGuide = {
    short: "under 80 characters",
    medium: "80-120 characters",
    long: "120-160 characters",
  };

  const context = buildContextFromPlaceholders(placeholders);

  return `Generate a ${tone} SMS message for ${messageType}. Keep it ${
    lengthGuide[length]
  }. ${includeEmoji ? "Include emojis." : "No emojis."}

Context: ${context}

SMS message:`;
}

function buildContextFromPlaceholders(placeholders: any): string {
  const context = [];

  if (placeholders.ownerName) {
    context.push(`Person: ${placeholders.ownerName}`);
  }
  if (placeholders.vehicleLicense) {
    context.push(`Vehicle: ${placeholders.vehicleLicense}`);
  }
  if (placeholders.vehicleMake && placeholders.vehicleModel) {
    context.push(
      `Car: ${placeholders.vehicleMake} ${placeholders.vehicleModel}`
    );
  }
  if (placeholders.cameraLocation) {
    context.push(`Location: ${placeholders.cameraLocation}`);
  }
  if (placeholders.systemName) {
    context.push(`System: ${placeholders.systemName}`);
  }

  return context.join(", ") || "Security system notification";
}

function processGeneratedMessage(
  message: string,
  originalPrompt: string
): string {
  let processed = message.trim();

  // Remove the original prompt if it appears in the response
  processed = processed.replace(originalPrompt, "").trim();

  // Clean up common AI artifacts
  processed = processed.replace(/^(SMS message:|Message:|Text:)/i, "").trim();
  processed = processed.replace(/\n+/g, " ").trim();

  // Ensure it's not too long for SMS
  if (processed.length > 160) {
    processed = processed.substring(0, 157) + "...";
  }

  return processed;
}

function isValidSmsMessage(message: string): boolean {
  // Basic validation - message should have some meaningful content
  const meaningfulWords = [
    "welcome",
    "vehicle",
    "car",
    "system",
    "alert",
    "detected",
    "registered",
    "security",
  ];
  const lowerMessage = message.toLowerCase();

  return (
    meaningfulWords.some((word) => lowerMessage.includes(word)) ||
    message.length > 30
  );
}

function getTemplateMessage(options: SmsGenerationOptions): string {
  const template =
    MESSAGE_TEMPLATES[options.messageType]?.[options.tone] ||
    MESSAGE_TEMPLATES[options.messageType]?.professional ||
    "System notification: {systemName} alert.";

  return template;
}

export async function POST(request: NextRequest) {
  try {
    const options: SmsGenerationOptions = await request.json();

    // Check if Hugging Face API key is available
    const hasHuggingFaceKey = !!(
      process.env.HUGGINGFACE_API_KEY ||
      process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY
    );

    if (!hasHuggingFaceKey) {
      // Return template-based message
      const template = getTemplateMessage(options);
      return NextResponse.json({
        success: true,
        message: template,
        generatedBy: "template",
      });
    }

    try {
      // Try to generate with Hugging Face AI
      const prompt = buildPrompt(options);
      const response = await callHuggingFaceAPI(prompt);

      if (response && response.length > 0) {
        const generatedText =
          response[0].generated_text || response[0].text || "";
        const processedMessage = processGeneratedMessage(generatedText, prompt);

        // Validate the generated message
        if (
          processedMessage.length > 10 &&
          isValidSmsMessage(processedMessage)
        ) {
          return NextResponse.json({
            success: true,
            message: processedMessage,
            generatedBy: "ai",
          });
        } else {
          // Fall back to template if generated message is invalid
          const template = getTemplateMessage(options);
          return NextResponse.json({
            success: true,
            message: template,
            generatedBy: "template",
          });
        }
      } else {
        throw new Error("No response from Hugging Face API");
      }
    } catch (aiError) {
      console.error("AI generation failed:", aiError);
      // Fall back to template
      const template = getTemplateMessage(options);
      return NextResponse.json({
        success: true,
        message: template,
        generatedBy: "template",
      });
    }
  } catch (error) {
    console.error("SMS generation API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate SMS message",
      },
      { status: 500 }
    );
  }
}
