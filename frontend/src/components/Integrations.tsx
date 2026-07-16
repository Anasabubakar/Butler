"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "./Card";
import Button from "./Button";
import { api, type IntegrationCatalogItem } from "@/lib/api";
import { getAccessToken } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface IntegrationsProps {
  hasWorkspace: boolean;
  onConnectWorkspace: () => Promise<boolean>;
}

type TabKey = "all" | "connected" | "available" | "coming_soon";

export default function Integrations({ hasWorkspace, onConnectWorkspace }: IntegrationsProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<IntegrationCatalogItem[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.integrations.list();
      setItems(data);
    } catch (err) {
      setItems([]);
      const msg = err instanceof Error ? err.message : "Failed to load integrations";
      // Common when backend is redeploying or migrations failed
      if (/404|not found/i.test(msg)) {
        setError(
          "Integrations API not found (404). The backend is likely still on an old deploy or crash-looping. Check Render logs for migration errors, then redeploy."
        );
      } else if (/401|unauthorized|invalid or expired/i.test(msg)) {
        setError("Session expired. Sign out and sign in again, then reopen Integrations.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, hasWorkspace]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const err = params.get("error");
    if (connected) {
      setMessage(`${connected} connected successfully.`);
      void load();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (err) {
      setError(`Connection failed: ${err}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [load]);

  // When Workspace is live client-side, vault the token on the backend.
  useEffect(() => {
    if (!hasWorkspace) return;
    const token = getAccessToken();
    if (!token) return;
    void api.integrations
      .registerGoogle({
        accessToken: token,
        email: user?.email || undefined,
      })
      .then(() => load())
      .catch(() => {
        /* non-blocking */
      });
  }, [hasWorkspace, user?.email, load]);

  const connected = useMemo(
    () => items.filter((i) => i.status === "connected"),
    [items]
  );
  const available = useMemo(
    () => items.filter((i) => i.status === "available" || i.status === "not_configured"),
    [items]
  );
  const coming = useMemo(
    () => items.filter((i) => i.status === "coming_soon"),
    [items]
  );

  const list =
    tab === "all"
      ? items
      : tab === "connected"
      ? connected
      : tab === "available"
      ? available
      : coming;

  const handleConnect = async (item: IntegrationCatalogItem) => {
    setMessage(null);
    setError(null);
    setBusy(item.id);

    try {
      if (item.id === "google" || item.authType === "client") {
        const ok = await onConnectWorkspace();
        if (!ok) {
          setError("Could not complete Google Workspace connection.");
          return;
        }
        const token = getAccessToken();
        if (token) {
          await api.integrations.registerGoogle({
            accessToken: token,
            email: user?.email || undefined,
          });
        }
        setMessage("Google Workspace connected. Calendar, Gmail, Tasks, and Drive are live.");
        await load();
        return;
      }

      const res = await api.integrations.connect(
        item.id,
        `${window.location.origin}/dashboard/integrations`
      );

      if (res.mode === "redirect" && res.authUrl) {
        window.location.href = res.authUrl;
        return;
      }
      if (res.mode === "disabled") {
        setMessage(`${item.name} setup is coming soon.`);
        return;
      }
      setMessage(res.message || "Connect flow started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async (item: IntegrationCatalogItem) => {
    if (!window.confirm(`Disconnect ${item.name}? Butler will stop using it.`)) return;
    setBusy(item.id);
    setError(null);
    try {
      await api.integrations.disconnect(item.id);
      setMessage(`${item.name} disconnected.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-b-canvas">
      <div className="px-14 pt-14 pb-14 max-w-[1300px]">
        <h1 className="display-s text-b-text-primary">Integrations</h1>
        <p className="body-lg mt-4 text-b-text-secondary">
          What Butler can touch on your behalf. Grant a service, and it joins the house.
        </p>

        {message && (
          <p className="body-sm mt-4 text-b-accent-text" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="body-sm mt-4 text-b-danger" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex gap-6 border-b border-b-border-subtle">
          {(
            [
              ["all", `All · ${items.length || "—"}`],
              ["connected", `Connected · ${connected.length}`],
              ["available", `Available · ${available.length}`],
              ["coming_soon", `Coming soon · ${coming.length}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="pb-3 relative"
              style={{
                color: tab === key ? "var(--color-b-text-primary)" : "var(--color-b-text-tertiary)",
              }}
            >
              <span className="body-md-med">{label}</span>
              {tab === key && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-b-accent" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 mb-2">
          <div className="mono-label text-b-accent-text">Your household</div>
          <h2 className="type-h3 mt-1 text-b-text-primary">
            {connected.length > 0
              ? `${connected.length} service${connected.length === 1 ? "" : "s"} speak to Butler.`
              : "Connect a service so Butler can act on your behalf."}
          </h2>
        </div>

        {loading ? (
          <p className="body-sm text-b-text-tertiary mt-10 animate-pulse">Loading connectors…</p>
        ) : list.length === 0 ? (
          <Card tone="paper" className="p-8 mt-8">
            <p className="body-md text-b-text-secondary">No integrations in this view.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
            {list.map((s) => (
              <ServiceCard
                key={s.id}
                item={s}
                busy={busy === s.id}
                onConnect={() => handleConnect(s)}
                onDisconnect={() => handleDisconnect(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceCard({
  item,
  busy,
  onConnect,
  onDisconnect,
}: {
  item: IntegrationCatalogItem;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const isConnected = item.status === "connected";
  const isComing = item.status === "coming_soon";
  const isNotConfigured = item.status === "not_configured";

  return (
    <Card tone="paper" className="p-6 flex flex-col gap-5 min-h-[180px]">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-b-sunken">
          <span className="mono-label text-b-text-primary">
            {item.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        </div>
        <span
          aria-label={item.status}
          className="w-2 h-2 rounded-full"
          style={{
            background: isConnected
              ? "var(--color-b-success)"
              : isComing || isNotConfigured
              ? "var(--color-b-text-tertiary)"
              : "var(--color-b-warning)",
          }}
        />
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="type-h4 text-b-text-primary">{item.name}</div>
        <div className="mono-sm text-b-text-tertiary">{item.role}</div>
        <div className="body-sm text-b-text-secondary">{item.scopes}</div>
        {isConnected && item.accountLabel && (
          <div className="body-sm text-b-text-tertiary mt-1">{item.accountLabel}</div>
        )}
        {(isComing || isNotConfigured) && (
          <div className="body-sm text-b-text-tertiary mt-2 leading-relaxed">
            Coming soon — setup details will land here when this connector is ready.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="mono-label text-b-text-tertiary">
          {isConnected
            ? item.lastSyncedAt
              ? "sync · live"
              : "connected"
            : isComing || isNotConfigured
            ? "coming soon"
            : "not connected"}
        </span>
        {isConnected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={busy}
            className="mono-label text-b-accent-text hover:underline cursor-pointer disabled:opacity-50"
          >
            {busy ? "…" : "Disconnect"}
          </button>
        ) : isComing || isNotConfigured ? (
          <span className="mono-label text-b-text-tertiary">Coming soon</span>
        ) : (
          <Button size="sm" variant="primary" onClick={onConnect} disabled={busy}>
            {busy ? "…" : "Connect"}
          </Button>
        )}
      </div>
    </Card>
  );
}
