import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import type { NoteBlock, FilterTemplate, FilterRules, TagGroup } from '../types/models';
import { computed, ref } from 'vue';
import { useUIStore } from './uiStore'; // Import UI Store

export const useNoteStore = defineStore('note', () => {
  // --- State ---
  const notes = useStorage<NoteBlock[]>('blocknote-notes', []);
  const templates = useStorage<FilterTemplate[]>('blocknote-templates', []);
  const tagGroups = useStorage<TagGroup[]>('blocknote-tag-groups', []);
  const lightTagSystem = useStorage<string[]>('blocknote-light-tag-system', []);
  const normalTagSystem = useStorage<string[]>('blocknote-normal-tag-system', []);
  
  // Active filter state (not persisted automatically, resets on reload, or could be persisted)
  const activeFilter = useStorage<FilterRules>('blocknote-active-filter', {
    includeTags: []
  });

  // Toggle states for filters and visibility
  const isTemplateEnabled = useStorage('blocknote-template-enabled', true);
  const isLightFilterEnabled = useStorage('blocknote-light-filter-enabled', true);
  // Secondary filter for Home View (Right Sidebar)
  const secondaryFilterTags = ref<string[]>([]);
  
  // Template multi-select
  const selectedTemplateIds = useStorage<string[]>('blocknote-selected-templates', []);
  const templateFilterMode = useStorage<'and' | 'or'>('blocknote-template-filter-mode', 'and');
  
  // Normal tag staging area
  const normalTagStagingArea = ref<string[]>([]);
  const isNormalTagFilterEnabled = useStorage('blocknote-normal-tag-filter-enabled', false);
  const normalTagFilterMode = useStorage<'and' | 'or'>('blocknote-normal-tag-filter-mode', 'and');
  
  // Keep currentTemplateId for backward compatibility (will be removed later)
  const currentTemplateId = computed({
    get: () => selectedTemplateIds.value.length === 1 ? selectedTemplateIds.value[0] : null,
    set: (val) => {
      if (val) {
        selectedTemplateIds.value = [val];
      } else {
        selectedTemplateIds.value = [];
      }
    }
  });

  // --- Getters ---
  
  const allTags = computed(() => {
    return [...normalTagSystem.value].sort();
  });

  const uncategorizedTags = computed(() => {
    const categorized = new Set<string>();
    tagGroups.value.forEach(group => {
      group.tags.forEach(tag => categorized.add(tag));
    });
    return allTags.value.filter(tag => !categorized.has(tag));
  });

  const filteredNotes = computed(() => {
    let result = notes.value;

    // 1. Apply Template Filter (Multi-select with AND/OR mode)
    if (isTemplateEnabled.value && selectedTemplateIds.value.length > 0) {
      const selectedTemplates = templates.value.filter(t => selectedTemplateIds.value.includes(t.id));
      
      if (templateFilterMode.value === 'and') {
        // AND mode: note must contain all tags from all selected templates
        const allRequiredTags = new Set<string>();
        selectedTemplates.forEach(template => {
          template.filterRules.includeTags.forEach(tag => allRequiredTags.add(tag));
        });
        result = result.filter(note => {
          return Array.from(allRequiredTags).every(tag => note.tags.includes(tag));
        });
      } else {
        // OR mode: note must contain all tags from at least one template
        result = result.filter(note => {
          return selectedTemplates.some(template => {
            return template.filterRules.includeTags.every(tag => note.tags.includes(tag));
          });
        });
      }
    } else if (isTemplateEnabled.value && activeFilter.value.includeTags.length > 0) {
      // Fallback to activeFilter for backward compatibility
      result = result.filter(note => {
        return activeFilter.value.includeTags.every(tag => note.tags.includes(tag));
      });
    }

    // 2. Apply Normal Tag Staging Area Filter (if enabled)
    if (isNormalTagFilterEnabled.value && normalTagStagingArea.value.length > 0) {
      if (normalTagFilterMode.value === 'and') {
        result = result.filter(note => {
          return normalTagStagingArea.value.every(tag => note.tags.includes(tag));
        });
      } else {
        result = result.filter(note => {
          return normalTagStagingArea.value.some(tag => note.tags.includes(tag));
        });
      }
    }

    // 3. Apply Secondary Filter (Light Tags) (if enabled)
    if (isLightFilterEnabled.value && secondaryFilterTags.value.length > 0) {
        result = result.filter(note => {
            // Check lightTags specifically. Note: existing notes might not have lightTags initialized.
            return secondaryFilterTags.value.every(tag => note.lightTags?.includes(tag));
        });
    }
    
    return result;
  });

  // --- Actions ---

  function addNote() {
    const newNote: NoteBlock = {
      id: uuidv4(),
      title: '',
      content: '',
      tags: [],
      lightTags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isCollapsed: false,
    };
    if (activeFilter.value.includeTags.length > 0) {
        newNote.tags = [...activeFilter.value.includeTags];
    }
    notes.value.push(newNote);
  }

  function deleteNote(id: string) {
    const index = notes.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notes.value.splice(index, 1);
    }
  }

  function updateNote(id: string, updates: Partial<NoteBlock>) {
    const note = notes.value.find((n) => n.id === id);
    if (note) {
      Object.assign(note, { ...updates, updatedAt: Date.now() });
    }
  }

  function toggleCollapse(id: string) {
    const note = notes.value.find((n) => n.id === id);
    if (note) {
      note.isCollapsed = !note.isCollapsed;
    }
  }

  // Tag Actions
  function addTag(noteId: string, tag: string) {
    const note = notes.value.find(n => n.id === noteId);
    const trimmedTag = tag.trim();
    if (note && trimmedTag && !note.tags.includes(trimmedTag)) {
      note.tags.push(trimmedTag);
      note.updatedAt = Date.now();
      
      // 如果普通标签系统中没有这个标签，则添加到系统
      if (!normalTagSystem.value.includes(trimmedTag)) {
        normalTagSystem.value.push(trimmedTag);
      }
    }
  }

  function removeTag(noteId: string, tag: string) {
    const note = notes.value.find(n => n.id === noteId);
    if (note) {
      note.tags = note.tags.filter(t => t !== tag);
      note.updatedAt = Date.now();
    }
  }

  // Light Tag Actions
  function addLightTag(noteId: string, tag: string) {
    const note = notes.value.find(n => n.id === noteId);
    const trimmedTag = tag.trim();
    if (note && trimmedTag) {
      if (!note.lightTags) note.lightTags = [];
      if (!note.lightTags.includes(trimmedTag)) {
        note.lightTags.push(trimmedTag);
        note.updatedAt = Date.now();
        
        // 如果轻标签系统中没有这个标签，则添加到系统
        if (!lightTagSystem.value.includes(trimmedTag)) {
          lightTagSystem.value.push(trimmedTag);
        }
      }
    }
  }

  function removeLightTag(noteId: string, tag: string) {
    const note = notes.value.find(n => n.id === noteId);
    if (note && note.lightTags) {
      note.lightTags = note.lightTags.filter(t => t !== tag);
      note.updatedAt = Date.now();
    }
  }

  function renameLightTagGlobal(oldTag: string, newTag: string) {
    const trimmedNew = newTag.trim();
    if (!trimmedNew || trimmedNew === oldTag) return;
    
    notes.value.forEach(note => {
        if (note.lightTags && note.lightTags.includes(oldTag)) {
            note.lightTags = note.lightTags.map(t => t === oldTag ? trimmedNew : t);
            note.lightTags = [...new Set(note.lightTags)];
            note.updatedAt = Date.now();
        }
    });

    if (secondaryFilterTags.value.includes(oldTag)) {
        secondaryFilterTags.value = secondaryFilterTags.value.map(t => t === oldTag ? trimmedNew : t);
    }
    
    // 更新轻标签系统
    if (lightTagSystem.value.includes(oldTag)) {
        lightTagSystem.value = lightTagSystem.value.map(t => t === oldTag ? trimmedNew : t);
        lightTagSystem.value = [...new Set(lightTagSystem.value)];
    }
  }

  function deleteLightTagGlobal(tag: string) {
    notes.value.forEach(note => {
        if (note.lightTags) {
            note.lightTags = note.lightTags.filter(t => t !== tag);
        }
    });
    secondaryFilterTags.value = secondaryFilterTags.value.filter(t => t !== tag);
    
    // 从轻标签系统中删除
    lightTagSystem.value = lightTagSystem.value.filter(t => t !== tag);
  }

  function renameTagGlobal(oldTag: string, newTag: string) {
    const trimmedNew = newTag.trim();
    if (!trimmedNew || trimmedNew === oldTag) return;

    // 1. Update Notes
    notes.value.forEach(note => {
      if (note.tags.includes(oldTag)) {
        note.tags = note.tags.map(t => t === oldTag ? trimmedNew : t);
        // Remove duplicates if newTag already existed on note
        note.tags = [...new Set(note.tags)];
        note.updatedAt = Date.now();
      }
    });

    // 2. Update Tag Groups
    tagGroups.value.forEach(group => {
      if (group.tags.includes(oldTag)) {
        group.tags = group.tags.map(t => t === oldTag ? trimmedNew : t);
        group.tags = [...new Set(group.tags)];
      }
    });

    // 3. Update Templates
    templates.value.forEach(template => {
      if (template.filterRules.includeTags.includes(oldTag)) {
        template.filterRules.includeTags = template.filterRules.includeTags.map(t => t === oldTag ? trimmedNew : t);
        template.filterRules.includeTags = [...new Set(template.filterRules.includeTags)];
      }
    });
    
    // 4. Update Active Filter
    if (activeFilter.value.includeTags.includes(oldTag)) {
        activeFilter.value.includeTags = activeFilter.value.includeTags.map(t => t === oldTag ? trimmedNew : t);
    }
    
    // 5. Update Normal Tag System
    if (normalTagSystem.value.includes(oldTag)) {
        normalTagSystem.value = normalTagSystem.value.map(t => t === oldTag ? trimmedNew : t);
        normalTagSystem.value = [...new Set(normalTagSystem.value)];
    }
  }

  function deleteTagGlobal(tag: string) {
    // 1. Update Notes
    notes.value.forEach(note => {
      note.tags = note.tags.filter(t => t !== tag);
    });

    // 2. Update Tag Groups
    tagGroups.value.forEach(group => {
      group.tags = group.tags.filter(t => t !== tag);
    });

    // 3. Update Templates
    templates.value.forEach(template => {
      template.filterRules.includeTags = template.filterRules.includeTags.filter(t => t !== tag);
    });
    
    // 4. Update Active Filter
    activeFilter.value.includeTags = activeFilter.value.includeTags.filter(t => t !== tag);
    
    // 5. Update Normal Tag System
    normalTagSystem.value = normalTagSystem.value.filter(t => t !== tag);
  }

  // Tag Group Actions
  function createTagGroup(name: string) {
    const newGroup: TagGroup = {
      id: uuidv4(),
      name,
      tags: []
    };
    tagGroups.value.push(newGroup);
  }

  function deleteTagGroup(id: string) {
    const index = tagGroups.value.findIndex(g => g.id === id);
    if (index !== -1) {
      tagGroups.value.splice(index, 1);
    }
  }

  function updateTagGroup(id: string, updates: Partial<TagGroup>) {
    const group = tagGroups.value.find(g => g.id === id);
    if (group) {
      Object.assign(group, updates);
    }
  }

  function addTagToGroup(groupId: string, tag: string) {
    const group = tagGroups.value.find(g => g.id === groupId);
    if (group && !group.tags.includes(tag)) {
      // Remove from other groups first to ensure single assignment? 
      // Or allow multi-group? Plan says "classify tags", usually implies one group or flexible.
      // Let's assume flexible for now, but typically categorization implies unique parent.
      // If we want strict categorization:
      tagGroups.value.forEach(g => {
        if (g.id !== groupId && g.tags.includes(tag)) {
           g.tags = g.tags.filter(t => t !== tag);
        }
      });

      group.tags.push(tag);
      
      // 如果普通标签系统中没有这个标签，则添加到系统
      if (!normalTagSystem.value.includes(tag)) {
        normalTagSystem.value.push(tag);
      }
    }
  }

  function removeTagFromGroup(groupId: string, tag: string) {
    const group = tagGroups.value.find(g => g.id === groupId);
    if (group) {
      group.tags = group.tags.filter(t => t !== tag);
    }
  }

  // Helper function to count tag usage in notes
  function getTagUsageCount(tag: string): number {
    return notes.value.filter(note => note.tags.includes(tag)).length;
  }

  // Filter & Template Actions
  function setFilterTag(tag: string) {
    if (activeFilter.value.includeTags.includes(tag)) {
      activeFilter.value.includeTags = activeFilter.value.includeTags.filter(t => t !== tag);
    } else {
      activeFilter.value.includeTags.push(tag);
    }
    // Note: We don't clear currentTemplateId immediately here to allow "modifying" the view temporarily,
    // but strict behavior might require it. Original code did:
    // currentTemplateId.value = null; 
    // Let's keep it for now to indicate "unsaved changes" vs template.
    currentTemplateId.value = null; 
  }

  function clearFilter() {
    activeFilter.value.includeTags = [];
    selectedTemplateIds.value = [];
  }

  function createTemplate(name: string, associatedTagGroups: string[] = []) {
    const newTemplate: FilterTemplate = {
      id: uuidv4(),
      name,
      filterRules: JSON.parse(JSON.stringify(activeFilter.value)),
      associatedTagGroups
    };
    templates.value.push(newTemplate);
    selectedTemplateIds.value = [newTemplate.id];
  }

  function updateTemplate(id: string, updates: Partial<FilterTemplate>) {
    const template = templates.value.find(t => t.id === id);
    if (template) {
        Object.assign(template, updates);
    }
  }

  function deleteTemplate(id: string) {
    const index = templates.value.findIndex(t => t.id === id);
    if (index !== -1) {
      templates.value.splice(index, 1);
      selectedTemplateIds.value = selectedTemplateIds.value.filter(tid => tid !== id);
    }
  }

  function toggleTemplate(id: string) {
    const index = selectedTemplateIds.value.indexOf(id);
    if (index > -1) {
      selectedTemplateIds.value.splice(index, 1);
    } else {
      selectedTemplateIds.value.push(id);
    }
  }

  function switchTemplate(id: string) {
    // For backward compatibility, but now uses toggleTemplate
    const template = templates.value.find(t => t.id === id);
    if (template) {
      activeFilter.value = JSON.parse(JSON.stringify(template.filterRules));
      selectedTemplateIds.value = [id];
    }
  }

  function getTemplateMatchCount(templateId: string): number {
    const template = templates.value.find(t => t.id === templateId);
    if (!template) return 0;
    
    return notes.value.filter(note => {
      return template.filterRules.includeTags.every(tag => note.tags.includes(tag));
    }).length;
  }

  return {
    notes,
    templates,
    tagGroups,
    lightTagSystem,
    normalTagSystem,
    activeFilter,
    isTemplateEnabled,
    isLightFilterEnabled,
    secondaryFilterTags,
    selectedTemplateIds,
    templateFilterMode,
    normalTagStagingArea,
    isNormalTagFilterEnabled,
    normalTagFilterMode,
    currentTemplateId,
    allTags,
    uncategorizedTags,
    filteredNotes,
    addNote,
    deleteNote,
    updateNote,
    toggleCollapse,
    addTag,
    removeTag,
    addLightTag,
    removeLightTag,
    renameLightTagGlobal,
    deleteLightTagGlobal,
    renameTagGlobal,
    deleteTagGlobal,
    createTagGroup,
    deleteTagGroup,
    updateTagGroup,
    addTagToGroup,
    removeTagFromGroup,
    setFilterTag,
    clearFilter,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplate,
    switchTemplate,
    getTagUsageCount,
    getTemplateMatchCount
  };
});
