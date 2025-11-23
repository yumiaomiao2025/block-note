import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import type { NoteBlock, FilterTemplate, FilterRules } from '../types/models';
import { computed } from 'vue';
import { useUIStore } from './uiStore'; // Import UI Store

export const useNoteStore = defineStore('note', () => {
  // --- State ---
  const notes = useStorage<NoteBlock[]>('blocknote-notes', []);
  const templates = useStorage<FilterTemplate[]>('blocknote-templates', []);
  
  // Active filter state (not persisted automatically, resets on reload, or could be persisted)
  const activeFilter = useStorage<FilterRules>('blocknote-active-filter', {
    includeTags: []
  });
  
  const currentTemplateId = useStorage<string | null>('blocknote-current-template', null);

  // --- Getters ---
  
  const allTags = computed(() => {
    const tags = new Set<string>();
    notes.value.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  });

  const filteredNotes = computed(() => {
    if (activeFilter.value.includeTags.length === 0) {
      return notes.value;
    }
    return notes.value.filter(note => {
      return activeFilter.value.includeTags.every(tag => note.tags.includes(tag));
    });
  });

  // --- Actions ---

  function addNote() {
    const newNote: NoteBlock = {
      id: uuidv4(),
      title: '',
      content: '',
      tags: [],
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

  // Filter & Template Actions
  function setFilterTag(tag: string) {
    if (activeFilter.value.includeTags.includes(tag)) {
      activeFilter.value.includeTags = activeFilter.value.includeTags.filter(t => t !== tag);
    } else {
      activeFilter.value.includeTags.push(tag);
    }
    currentTemplateId.value = null; 
  }

  function clearFilter() {
    activeFilter.value.includeTags = [];
    currentTemplateId.value = null;
    // Reset UI to default when clearing filter (optional, but makes sense to exit "theme mode")
    const uiStore = useUIStore();
    uiStore.currentConfig = JSON.parse(JSON.stringify(uiStore.defaultConfig));
  }

  function createTemplate(name: string) {
    const uiStore = useUIStore();
    const newTemplate: FilterTemplate = {
      id: uuidv4(),
      name,
      filterRules: JSON.parse(JSON.stringify(activeFilter.value)),
      // Save current UI config with the template
      themeConfig: JSON.parse(JSON.stringify(uiStore.currentConfig)) 
    };
    templates.value.push(newTemplate);
    currentTemplateId.value = newTemplate.id;
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
        // Deep merge or replace? Replace is safer for "switch theme" feeling.
        // But we must ensure all required fields exist.
        // Since we save full config, full replace is fine.
        uiStore.currentConfig = JSON.parse(JSON.stringify(template.themeConfig));
      }
    }
  }

  return {
    notes,
    templates,
    activeFilter,
    currentTemplateId,
    allTags,
    filteredNotes,
    addNote,
    deleteNote,
    updateNote,
    toggleCollapse,
    addTag,
    removeTag,
    setFilterTag,
    clearFilter,
    createTemplate,
    deleteTemplate,
    switchTemplate
  };
});
