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
  
  // Active filter state (not persisted automatically, resets on reload, or could be persisted)
  const activeFilter = useStorage<FilterRules>('blocknote-active-filter', {
    includeTags: []
  });

  // Toggle states for filters and visibility
  const isTemplateEnabled = useStorage('blocknote-template-enabled', true);
  const isLightFilterEnabled = useStorage('blocknote-light-filter-enabled', true);
  // Secondary filter for Home View (Right Sidebar)
  const secondaryFilterTags = ref<string[]>([]);
  
  const currentTemplateId = useStorage<string | null>('blocknote-current-template', null);

  // --- Getters ---
  
  const allTags = computed(() => {
    const tags = new Set<string>();
    notes.value.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
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

    // 1. Apply Template/Active Filter (if enabled)
    if (isTemplateEnabled.value && activeFilter.value.includeTags.length > 0) {
      result = result.filter(note => {
        return activeFilter.value.includeTags.every(tag => note.tags.includes(tag));
      });
    }

    // 2. Apply Secondary Filter (Light Tags) (if enabled)
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
  }

  function deleteLightTagGlobal(tag: string) {
    notes.value.forEach(note => {
        if (note.lightTags) {
            note.lightTags = note.lightTags.filter(t => t !== tag);
        }
    });
    secondaryFilterTags.value = secondaryFilterTags.value.filter(t => t !== tag);
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
    }
  }

  function removeTagFromGroup(groupId: string, tag: string) {
    const group = tagGroups.value.find(g => g.id === groupId);
    if (group) {
      group.tags = group.tags.filter(t => t !== tag);
    }
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
    currentTemplateId.value = null;
    // Reset UI to default when clearing filter (optional, but makes sense to exit "theme mode")
    const uiStore = useUIStore();
    uiStore.currentConfig = JSON.parse(JSON.stringify(uiStore.defaultConfig));
  }

  function createTemplate(name: string, associatedTagGroups: string[] = []) {
    const uiStore = useUIStore();
    const newTemplate: FilterTemplate = {
      id: uuidv4(),
      name,
      filterRules: JSON.parse(JSON.stringify(activeFilter.value)),
      themeConfig: JSON.parse(JSON.stringify(uiStore.currentConfig)),
      associatedTagGroups
    };
    templates.value.push(newTemplate);
    currentTemplateId.value = newTemplate.id;
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
      if (currentTemplateId.value === id) {
        currentTemplateId.value = null;
      }
    }
  }

  function switchTemplate(id: string) {
    const template = templates.value.find(t => t.id === id);
    if (template) {
      activeFilter.value = JSON.parse(JSON.stringify(template.filterRules));
      currentTemplateId.value = id;
      
      // Apply Theme if exists
      if (template.themeConfig) {
        const uiStore = useUIStore();
        uiStore.currentConfig = JSON.parse(JSON.stringify(template.themeConfig));
      }
    }
  }

  return {
    notes,
    templates,
    tagGroups,
    activeFilter,
    isTemplateEnabled,
    isLightFilterEnabled,
    secondaryFilterTags,
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
    switchTemplate
  };
});
