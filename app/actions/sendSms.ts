"use server";

import { sendBulkSms } from "@/lib/sms-service";

export async function sendBulkSmsAction(phone: string[], message: string) {
  ``;
  return await sendBulkSms(phone, message);
}
