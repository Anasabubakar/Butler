"use client";

import {
  BellRingIcon,
  BookOpenIcon,
  CheckIcon,
  ClipboardIcon,
  GithubIcon,
  HouseIcon,
  LayoutGridIcon,
  LinkIcon,
  MailIcon,
  MessageCircleIcon,
  MicIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
} from "@animateicons/react/lucide";
import type { ComponentType, HTMLAttributes } from "react";

type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  isAnimated?: boolean;
  className?: string;
} & HTMLAttributes<HTMLDivElement>>;

export type IconName =
  | "search"
  | "bell"
  | "chat"
  | "settings"
  | "mic"
  | "mail"
  | "home"
  | "grid"
  | "link"
  | "github"
  | "clipboard"
  | "sparkles"
  | "users"
  | "book"
  | "check";

const ICON_MAP: Record<IconName, IconComponent> = {
  search: SearchIcon,
  bell: BellRingIcon,
  chat: MessageCircleIcon,
  settings: SettingsIcon,
  mic: MicIcon,
  mail: MailIcon,
  home: HouseIcon,
  grid: LayoutGridIcon,
  link: LinkIcon,
  github: GithubIcon,
  clipboard: ClipboardIcon,
  sparkles: SparklesIcon,
  users: UsersIcon,
  book: BookOpenIcon,
  check: CheckIcon,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  animate?: boolean;
  color?: string;
}

export default function Icon({
  name,
  size = 20,
  className = "",
  animate = false,
  color = "currentColor",
}: IconProps) {
  const Comp = ICON_MAP[name];
  return (
    <Comp
      size={size}
      color={color}
      isAnimated={animate}
      className={`inline-flex shrink-0 ${className}`}
    />
  );
}