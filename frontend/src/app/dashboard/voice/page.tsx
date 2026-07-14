"use client";

import { useRouter } from "next/navigation";
import VoiceAssistant from "@/components/VoiceAssistant";

export default function VoicePage() {
  const router = useRouter();
  return <VoiceAssistant onClose={() => router.push("/dashboard")} />;
}
