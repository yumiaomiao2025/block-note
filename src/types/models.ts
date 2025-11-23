export interface NoteBlock {
  id: string;
  title: string;
  content: string; // HTML string or Markdown
  tags: string[];  // Tag IDs or names
  createdAt: number;
  updatedAt: number;
  isCollapsed: boolean; // UI state
}

