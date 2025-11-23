<script setup lang="ts">
import { watch } from 'vue';
import { useTextareaAutosize } from '@vueuse/core';
import type { NoteBlock } from '../types/models';
import { useNoteStore } from '../stores/noteStore';

const props = defineProps<{
  note: NoteBlock;
}>();

const store = useNoteStore();
const { textarea, input } = useTextareaAutosize({ input: props.note.content });

// Watch for external changes (e.g. from store updates that didn't originate here)
watch(
  () => props.note.content,
  (newVal) => {
    if (newVal !== input.value) {
      input.value = newVal;
    }
  }
);

// Watch for input changes to update store
watch(input, (newVal) => {
  store.updateNote(props.note.id, { content: newVal });
});

function updateTitle(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  store.updateNote(props.note.id, { title: val });
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden transition-all duration-300">
    <!-- Header -->
    <div class="flex items-center p-2 px-3 bg-gray-50 border-b border-gray-100 group">
      <button 
        @click="store.toggleCollapse(note.id)"
        class="mr-2 text-gray-400 hover:text-gray-600 transition-colors w-5 h-5 flex items-center justify-center"
      >
        <svg v-if="note.isCollapsed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
        </svg>
      </button>
      
      <input 
        type="text" 
        :value="note.title"
        @input="updateTitle"
        placeholder="Untitled"
        class="flex-1 bg-transparent border-none outline-none font-semibold text-gray-700 placeholder-gray-400 text-sm"
      />

      <button 
        @click="store.deleteNote(note.id)"
        class="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div v-if="!note.isCollapsed" class="p-3 bg-white">
      <textarea
        ref="textarea"
        v-model="input"
        class="w-full resize-none border-none outline-none bg-transparent text-gray-700 leading-relaxed text-base p-0 focus:ring-0"
        placeholder="Type something..."
        rows="1"
      ></textarea>
    </div>
  </div>
</template>

