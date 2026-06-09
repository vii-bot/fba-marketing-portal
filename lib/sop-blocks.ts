// Notion-style structured content blocks for the SOP/Course CMS.
// SOPs store an array of these (SOP.blocks) instead of hardcoded HTML.

import { generateId } from "@/lib/utils";
import {
  Heading, Pilcrow, ListChecks, Image as ImageIcon, Video, Paperclip,
  AlertTriangle, Minus, Link2, HelpCircle, type LucideIcon,
} from "lucide-react";

export const BLOCK_TYPES = [
  "heading", "paragraph", "checklist", "image", "video", "file",
  "callout", "divider", "embed", "quiz",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface VideoBlockContent {
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
}

export interface FileBlockContent {
  name: string;
  url: string;
  description?: string;
}

export interface ImageBlockContent {
  url: string;
  caption?: string;
}

export interface CalloutBlockContent {
  style: "info" | "warning" | "success";
  text: string;
}

export interface EmbedBlockContent {
  url: string;
  label?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

// Maps each block type to the shape stored in `content`
export interface BlockContentMap {
  heading: string;
  paragraph: string;
  checklist: string[];
  image: ImageBlockContent;
  video: VideoBlockContent;
  file: FileBlockContent;
  callout: CalloutBlockContent;
  divider: null;
  embed: EmbedBlockContent;
  quiz: QuizQuestion[];
}

export interface SOPBlock<T extends BlockType = BlockType> {
  id: string;
  type: T;
  content: BlockContentMap[T];
}

export interface BlockTypeMeta {
  type: BlockType;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const BLOCK_TYPE_META: BlockTypeMeta[] = [
  { type: "heading",   label: "Heading",          description: "Section title",                 icon: Heading },
  { type: "paragraph", label: "Paragraph",        description: "Plain text content",            icon: Pilcrow },
  { type: "checklist", label: "Checklist",        description: "Step-by-step list",             icon: ListChecks },
  { type: "image",     label: "Image",            description: "Picture with optional caption", icon: ImageIcon },
  { type: "video",     label: "Video",            description: "Uploaded or linked video",      icon: Video },
  { type: "file",      label: "File attachment",  description: "Downloadable document",         icon: Paperclip },
  { type: "callout",   label: "Callout / Warning",description: "Highlighted note or warning",   icon: AlertTriangle },
  { type: "divider",   label: "Divider",          description: "Visual section break",          icon: Minus },
  { type: "embed",     label: "Link / Embed",     description: "External link or embed",        icon: Link2 },
  { type: "quiz",      label: "Quiz",             description: "Acknowledgement quiz",          icon: HelpCircle },
];

const EMPTY_CONTENT: { [K in BlockType]: BlockContentMap[K] } = {
  heading:   "",
  paragraph: "",
  checklist: [""],
  image:     { url: "", caption: "" },
  video:     { title: "", url: "", description: "" },
  file:      { name: "", url: "", description: "" },
  callout:   { style: "info", text: "" },
  divider:   null,
  embed:     { url: "", label: "" },
  quiz:      [{ question: "", options: ["", ""], answer: "" }],
};

export function emptyBlock<T extends BlockType>(type: T): SOPBlock<T> {
  return {
    id: generateId("block"),
    type,
    content: structuredClone(EMPTY_CONTENT[type]) as BlockContentMap[T],
  };
}

export function blockTypeMeta(type: BlockType): BlockTypeMeta {
  return BLOCK_TYPE_META.find(m => m.type === type)!;
}

// Converts legacy plain-text SOP content into a single paragraph block,
// so old SOPs can be opened and gradually migrated in the block editor.
export function legacyContentToBlocks(content: string): SOPBlock[] {
  if (!content?.trim()) return [];
  return [{ id: generateId("block"), type: "paragraph", content }];
}
