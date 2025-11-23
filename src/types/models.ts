export interface NoteBlock {
  id: string;
  title: string;
  content: string; // HTML string or Markdown
  tags: string[];  // Tag names
  createdAt: number;
  updatedAt: number;
  isCollapsed: boolean; // UI state
}

export interface UIThemeConfig {
  // 布局
  layout: {
    listStartX?: number;
    listStartY?: number;
    blockWidth: number;
    filterPosition?: { x: number, y: number };
  };
  // 样式
  style: {
    appBackgroundColor: string;
    blockBackgroundColor: string;
    blockFontColor: string;
    blockBorderRadius: number;
    blockBlur: number; // px
    tagColor: string;
  };
  // 装饰物
  decorations: DecorationItem[];
}

export interface DecorationItem {
  id: string;
  type: 'image' | 'text';
  content: string; // Image URL or Text content
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

export interface FilterRules {
  includeTags: string[];
  // excludeTags: string[]; // Reserved for future use
}

export interface FilterTemplate {
  id: string;
  name: string;
  filterRules: FilterRules;
  // Theme config bound to this template
  themeConfig?: UIThemeConfig; 
}
