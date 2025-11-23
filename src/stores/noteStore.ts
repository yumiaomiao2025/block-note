import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import type { NoteBlock } from '../types/models';

export const useNoteStore = defineStore('note', () => {
  const notes = useStorage<NoteBlock[]>('blocknote-notes', []);

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

  return {
    notes,
    addNote,
    deleteNote,
    updateNote,
    toggleCollapse,
  };
});

