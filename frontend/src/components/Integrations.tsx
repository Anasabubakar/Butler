"use client";

import { useState } from "react";
import Card from "./Card";
import Button from "./Button";

interface IntegrationsProps {
  hasWorkspace: boolean;
  onConnectWorkspace: () => Promise<boolean>;
}

type ServiceStatus = "connected" | "available" | "coming_soon";

type Service = {
  id: string;
  name: string;
  role: string;
  scopes: string;
  status: ServiceStatus;
  group: "google" | "work" | "automation";
};

const SERVICES: Service[] = [
  {
    id: "gmail",
    name: "Gmail",
    role: "the inbox",
    scopes: "Read · Write · Send",
    status: "available",
    group: "google",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    role: "the day",
    scopes: "Read · Write · Move",
    status: "available",
    group: "google",
  },
  {
    id: "drive",
    name: "Google Drive",
    role: "the files",
    scopes: "Read · Write · Organize",
    status: "available",
    group: "google",
  },
  {
    id: "docs",
    name: "Google Docs",
    role: "the writing",
    scopes: "Read · Write · Edit",
    status: "available",
    group: "google",
  },
  {
    id: "tasks",
    name: "Google Tasks",
    role: "the list",
    scopes: "Read · Write · Complete",
    status: "available",
    group: "google",
  },
  {
    id: "github",
    name: "GitHub",
    role: "the code",
    scopes: "Repos, PRs, issues",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "slack",
    name: "Slack",
    role: "the room",
    scopes: "Read + write in your voice",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "notion",
    name: "Notion",
    role: "the wiki",
    scopes: "Read + write pages",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "linear",
    name: "Linear",
    role: "the roadmap",
    scopes: "Tickets · Comments",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "figma",
    name: "Figma",
    role: "the design",
    scopes: "Files · Comments",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "zapier",
    name: "Zapier",
    role: "the plumbing",
    scopes: "Automations",
    status: "coming_soon",
    group: "automation",
  },
  {
