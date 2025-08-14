"use server";

import { sendCarRegistrationSms } from "@/lib/sms-service";


export async function sendCarRegistrationSmsAction(
  ownerName: string,
  phone: string,
  licensePlate: string,
  make: string,
  model: string
) {


    console.log("sendCarRegistrationSms action");
    
  return await sendCarRegistrationSms(
    ownerName,
    phone,
    licensePlate,
    make,
    model
  );
}
