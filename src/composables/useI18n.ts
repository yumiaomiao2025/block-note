import { computed } from 'vue';
import { useUIStore } from '../stores/uiStore';

type Language = 'zh' | 'en';

type Translations = {
  [key: string]: string | Translations;
};

const translations: Record<Language, Translations> = {
  zh: {
    nav: {
      home: '首页',
      tags: '标签（管理器）',
      templates: '模板（管理器）',
      quickPreview: '快捷预览',
      done: '完成',
      customizeUI: '自定义界面',
    },
    sidebar: {
      templates: '模板',
      allNotes: '全部笔记',
      tags: '标签',
      explorer: '资源管理器',
      tagStagingArea: '标签暂存区',
      quickFilter: '快速筛选',
      refineByLightTags: '通过轻标签筛选',
    },
    sort: {
      sort: '排序',
      frequency: '频率',
      alphabetical: '字母',
      byFrequency: '按使用频率排序',
      byAlphabetical: '按字母顺序排序',
    },
    btn: {
      editTags: '编辑标签',
      doneEditing: '完成编辑',
      clearAll: '清除全部',
      add: '添加',
      delete: '删除',
      save: '保存',
      cancel: '取消',
      confirm: '确认',
      edit: '编辑',
      done: '完成',
    },
    dialog: {
      deleteNote: {
        title: '删除笔记',
        message: '确认删除该笔记吗？此操作无法撤销。',
      },
      deleteTag: {
        title: '删除标签',
      },
      deleteTagGroup: {
        title: '删除标签组',
      },
      renameTag: {
        title: '确认重命名',
      },
    },
    placeholder: {
      addNewLightTag: '添加新轻标签...',
      searchTags: '搜索标签组和标签...',
      newTemplate: '新建模板',
      newGroup: '新建分组',
      tagName: '标签名称...',
      untitled: '无标题',
      typeSomething: '输入一些内容...',
      tag: '标签',
      lightTag: '+轻标签',
      newTemplateName: '新建模板名称',
      searchTemplates: '搜索模板...',
      groupName: '分组名称...',
    },
    status: {
      noTagsAvailable: '无可用标签',
      unknown: '未知',
      selected: '已选择',
      matches: '匹配',
      notes: '笔记',
      tags: '标签',
    },
    common: {
      general: '通用',
      uncategorized: '未分类',
      and: '与',
      or: '或',
      lightTags: '轻标签',
      normalTags: '标签',
      templates: '模板',
    },
    tooltip: {
      enableDisableTemplatesFilter: '启用/禁用模板筛选',
      showHideTagsOnCards: '显示/隐藏卡片上的标签',
      enableDisableNormalTagFilter: '启用/禁用普通标签筛选',
      addTagsToStagingArea: '添加标签到暂存区',
      enableDisableLightFilter: '启用/禁用轻标签筛选',
      showHideLightTagsOnCards: '显示/隐藏卡片上的轻标签',
      lightTagDisplaySettings: '轻标签显示设置',
      andMode: 'AND: 笔记必须包含所有选中的标签',
      orMode: 'OR: 笔记必须包含任一选中的标签',
      andModeLight: 'AND: 笔记必须包含所有选中的轻标签',
      orModeLight: 'OR: 笔记必须包含任一选中的轻标签',
      superPreview: '超级预览',
    },
    tagManager: {
      renameTag: '重命名标签',
      currentTag: '当前标签：',
      usageCount: '共有 {count} 个笔记正在使用此标签。重命名后，所有笔记和标签组中的该标签将被同步更新。如需查看使用此标签的笔记，请前往首页查看。',
      newTagName: '新标签名称：',
      searchTagGroupsAndTags: '搜索标签组和标签...',
      tagGroup: '标签组',
      tag: '标签',
      deleteTagGroupConfirm: '确定要删除标签组"{name}"吗？',
      deleteTagGroupWithTags: '该标签组包含 {count} 个标签，其中共有 {usage} 个笔记正在使用这些标签。',
      deleteTagGroupNoTags: '该标签组目前没有标签。',
      deleteTagGroupWarning: '删除后，组内所有标签将变为未分类状态，相关笔记中的标签将被保留。',
      deleteTagConfirm: '确定要删除标签"{tag}"吗？',
      deleteTagUsage: '共有 {count} 个笔记正在使用此标签。',
      deleteTagWarning: '删除后，将从所有笔记和标签组中移除该标签。如需查看使用此标签的笔记，请前往首页查看。',
      renameTagConfirm: '确定要将标签"{oldTag}"重命名为"{newTag}"吗？',
      renameTagUsage: '共有 {count} 个笔记正在使用此标签，重命名后将同步更新所有笔记和标签组中的该标签。',
      renameTagWarning: '如需查看使用此标签的笔记，请前往首页查看。',
      addTag: '添加标签',
      noTagsInStagingArea: '暂存区中无标签。点击 + 图标添加标签。',
      noTagsHereYet: '暂无标签',
      allTagsOrganized: '您的所有标签都已整齐地组织在分组中！',
      dragUncategorizedTags: '将未分类标签拖到这里或创建新标签。',
      groups: '分组',
      manageTagsForGroup: '管理此分组的标签。',
      tagsCount: '标签',
    },
    templateManager: {
      templates: '模板',
      availableTags: '可用标签',
      selectedTags: '已选标签',
      clickToAdd: '点击添加',
      clickToRemove: '点击移除',
      noTagsSelected: '未选择标签',
      selectTemplateToEdit: '选择一个模板进行编辑或创建新模板。',
      matches: '匹配',
      deleteTemplate: '删除此模板？',
      deleteTemplates: '删除 {count} 个模板？',
      showHideStatistics: '显示/隐藏统计',
      selectAll: '全选',
      deselectAll: '取消全选',
      all: '全部',
      none: '无',
      duplicate: '复制',
      batchMode: '批量模式',
      exitBatch: '退出批量',
      sortManual: '手动排序',
      sortName: '名称 (A-Z)',
      sortUsage: '使用量 (高到低)',
      sortTime: '时间 (最新优先)',
    },
    lightTagSettings: {
      title: '轻标签显示设置',
      displayLimit: '显示限制',
      plusNThreshold: '"+N" 大于几个时显示',
      description: '如果设置很大，轻标签将全部显示，不会出现 "+N"。',
    },
    hoverPreview: {
      templateTags: '模板标签',
      tagGroupTags: '标签组标签',
      noTags: '无标签',
    },
    noteBlock: {
      remainingTags: '剩余标签',
      export: '导出',
      zenMode: '禅模式',
      exitZenMode: '退出禅模式',
      quickAddTag: '快速添加标签/模板',
      quickAddLightTag: '快速添加轻标签',
    },
    blockList: {
      newNote: '新建笔记',
      addNewBlock: '添加新卡片',
      noNotesMatchFilter: '没有笔记匹配您的筛选条件。',
      clearFilter: '清除筛选',
    },
    uiConfig: {
      uiEditor: '界面编辑器',
      appBackground: '应用背景',
      blockWidth: '卡片宽度 (px)',
      blockRadius: '卡片圆角 (px)',
      tagColor: '标签颜色',
      blockBackground: '卡片背景',
      blockFontColor: '卡片文字颜色',
    },
  },
  en: {
    nav: {
      home: 'Home',
      tags: 'Tags (Manager)',
      templates: 'Templates (Manager)',
      quickPreview: 'Quick Preview',
      done: 'Done',
      customizeUI: 'Customize UI',
    },
    sidebar: {
      templates: 'Templates',
      allNotes: 'All Notes',
      tags: 'Tags',
      explorer: 'Explorer',
      tagStagingArea: 'Tag Staging Area',
      quickFilter: 'Quick Filter',
      refineByLightTags: 'Refine by light tags',
    },
    sort: {
      sort: 'Sort',
      frequency: 'Frequency',
      alphabetical: 'Alphabetical',
      byFrequency: 'Sort by frequency',
      byAlphabetical: 'Sort alphabetically',
    },
    btn: {
      editTags: 'Edit Tags',
      doneEditing: 'Done Editing',
      clearAll: 'Clear All',
      add: 'Add',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      edit: 'Edit',
      done: 'Done',
    },
    dialog: {
      deleteNote: {
        title: 'Delete Note',
        message: 'Are you sure you want to delete this note? This action cannot be undone.',
      },
      deleteTag: {
        title: 'Delete Tag',
      },
      deleteTagGroup: {
        title: 'Delete Tag Group',
      },
      renameTag: {
        title: 'Confirm Rename',
      },
    },
    placeholder: {
      addNewLightTag: 'Add new light tag...',
      searchTags: 'Search tag groups and tags...',
      newTemplate: 'New Template',
      newGroup: 'New Group',
      tagName: 'Tag name...',
      untitled: 'Untitled',
      typeSomething: 'Type something...',
      tag: 'tag',
      lightTag: '+light tag',
      newTemplateName: 'New Template Name',
      searchTemplates: 'Search templates...',
      groupName: 'Group name...',
    },
    status: {
      noTagsAvailable: 'No tags available',
      unknown: 'Unknown',
      selected: 'selected',
      matches: 'Matches',
      notes: 'notes',
      tags: 'tags',
    },
    common: {
      general: 'General',
      uncategorized: 'Uncategorized',
      and: 'AND',
      or: 'OR',
      lightTags: 'Light Tags',
      normalTags: 'Tags',
      templates: 'Templates',
    },
    tooltip: {
      enableDisableTemplatesFilter: 'Enable/Disable Templates Filter',
      showHideTagsOnCards: 'Show/Hide Tags on Cards',
      enableDisableNormalTagFilter: 'Enable/Disable Normal Tag Filter',
      addTagsToStagingArea: 'Add Tags to Staging Area',
      enableDisableLightFilter: 'Enable/Disable Light Filter',
      showHideLightTagsOnCards: 'Show/Hide Light Tags on Cards',
      lightTagDisplaySettings: 'Light Tag Display Settings',
      andMode: 'AND: Notes must contain all selected tags',
      orMode: 'OR: Notes must contain any selected tag',
      andModeLight: 'AND: Notes must contain all selected light tags',
      orModeLight: 'OR: Notes must contain any selected light tag',
      superPreview: 'Super Preview',
    },
    tagManager: {
      renameTag: 'Rename Tag',
      currentTag: 'Current tag:',
      usageCount: '{count} notes are using this tag. After renaming, the tag will be updated in all notes and tag groups. To view notes using this tag, go to the home page.',
      newTagName: 'New tag name:',
      searchTagGroupsAndTags: 'Search tag groups and tags...',
      tagGroup: 'Tag Group',
      tag: 'Tag',
      deleteTagGroupConfirm: 'Are you sure you want to delete the tag group "{name}"?',
      deleteTagGroupWithTags: 'This tag group contains {count} tags, with a total of {usage} notes using these tags.',
      deleteTagGroupNoTags: 'This tag group currently has no tags.',
      deleteTagGroupWarning: 'After deletion, all tags in the group will become uncategorized, and tags in related notes will be preserved.',
      deleteTagConfirm: 'Are you sure you want to delete the tag "{tag}"?',
      deleteTagUsage: '{count} notes are using this tag.',
      deleteTagWarning: 'After deletion, the tag will be removed from all notes and tag groups. To view notes using this tag, go to the home page.',
      renameTagConfirm: 'Are you sure you want to rename the tag "{oldTag}" to "{newTag}"?',
      renameTagUsage: '{count} notes are using this tag. After renaming, the tag will be updated in all notes and tag groups.',
      renameTagWarning: 'To view notes using this tag, go to the home page.',
      addTag: 'Add Tag',
      noTagsInStagingArea: 'No tags in staging area. Click the + icon to add tags.',
      noTagsHereYet: 'No tags here yet',
      allTagsOrganized: 'All your tags are neatly organized in groups!',
      dragUncategorizedTags: 'Drag uncategorized tags here or create a new one.',
      groups: 'Groups',
      manageTagsForGroup: 'Manage tags for this group.',
      tagsCount: 'tags',
    },
    templateManager: {
      templates: 'Templates',
      availableTags: 'Available Tags',
      selectedTags: 'Selected Tags',
      clickToAdd: 'Click to Add',
      clickToRemove: 'Click to Remove',
      noTagsSelected: 'No tags selected',
      selectTemplateToEdit: 'Select a template to edit or create a new one.',
      matches: 'Matches',
      deleteTemplate: 'Delete this template?',
      deleteTemplates: 'Delete {count} template(s)?',
      showHideStatistics: 'Show/Hide Statistics',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      all: 'All',
      none: 'None',
      duplicate: 'Duplicate',
      batchMode: 'Batch Mode',
      exitBatch: 'Exit Batch',
      sortManual: 'Manual Order',
      sortName: 'Name (A-Z)',
      sortUsage: 'Usage (High to Low)',
      sortTime: 'Time (Newest First)',
    },
    lightTagSettings: {
      title: 'Light Tag Display Settings',
      displayLimit: 'Display Limit',
      plusNThreshold: 'Show "+N" when greater than',
      description: 'If set to a large value, all light tags will be displayed without "+N".',
    },
    hoverPreview: {
      templateTags: 'Template Tags',
      tagGroupTags: 'Tag Group Tags',
      noTags: 'No tags',
    },
    noteBlock: {
      remainingTags: 'Remaining Tags',
      export: 'Export',
      zenMode: 'Zen Mode',
      exitZenMode: 'Exit Zen Mode',
      quickAddTag: 'Quick Add Tag/Template',
      quickAddLightTag: 'Quick Add Light Tag',
    },
    blockList: {
      newNote: 'New Note',
      addNewBlock: 'Add new block',
      noNotesMatchFilter: 'No notes match your filter.',
      clearFilter: 'Clear filter',
    },
    uiConfig: {
      uiEditor: 'UI Editor',
      appBackground: 'App Background',
      blockWidth: 'Block Width (px)',
      blockRadius: 'Block Radius (px)',
      tagColor: 'Tag Color',
      blockBackground: 'Block Background',
      blockFontColor: 'Block Font Color',
    },
  },
};

/**
 * Get nested value from object by dot-separated key
 */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Replace placeholders in translation string
 */
function replacePlaceholders(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() ?? match;
  });
}

export function useI18n() {
  const uiStore = useUIStore();

  const t = (key: string, params?: Record<string, string | number>): string => {
    const currentLang = uiStore.language;
    const translation = getNestedValue(translations[currentLang], key);
    
    if (translation) {
      return params ? replacePlaceholders(translation, params) : translation;
    }
    
    // Fallback to key if translation not found
    return key;
  };

  return {
    t,
    language: computed(() => uiStore.language),
  };
}

