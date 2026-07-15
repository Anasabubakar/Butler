"use client";

import { useAuth } from "@/context/AuthContext";
import Integrations from "@/components/Integrations";

export default function IntegrationsPage() {
  const { user } = useAuth();
  return <Integrations hasWorkspace={!!user} />;
}
