<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTextareaAutosize } from '@vueuse/core';
import type { NoteBlock } from '../types/models';
import { useNoteStore } from '../stores/noteStore';
import { useUIStore } from '../stores/uiStore';
import { toPng } from 'html-to-image';

const props = defineProps<{
  note: NoteBlock;
}>();

const store = useNoteStore();
const uiStore = useUIStore();
const { textarea, input } = useTextareaAutosize({ input: props.note.content });
const newTagInput = ref('');
const isZenMode = ref(false);
const cardRef = ref<HTMLElement | null>(null);

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

function handleAddTag() {
  if (newTagInput.value.trim()) {
    store.addTag(props.note.id, newTagInput.value.trim());
    newTagInput.value = '';
  }
}

function removeTag(tag: string) {
  uiStore.showConfirm({
    title: '删除标签',
    message: `确认删除标签 "${tag}" 吗？`,
    confirmText: '删除',
    cancelText: '取消',
    onConfirm: () => store.removeTag(props.note.id, tag)
  });
}

function toggleZenMode() {
    isZenMode.value = !isZenMode.value;
    // Prevent body scroll when in Zen mode
    if (isZenMode.value) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function handleDeleteNote() {
  uiStore.showConfirm({
    title: '删除笔记',
    message: '确认删除该笔记吗？此操作无法撤销。',
    confirmText: '删除',
    cancelText: '取消',
    onConfirm: () => store.deleteNote(props.note.id)
  });
}

async function exportCard() {
  if (cardRef.value) {
    try {
      const dataUrl = await toPng(cardRef.value, {
        backgroundColor: 'rgba(0,0,0,0)', // 透明背景
        pixelRatio: 2, // 高清
        filter: (node) => {
          // 排除不想导出的元素（比如导出按钮本身）
          if (node.tagName && node.tagName.toLowerCase() === 'button') {
             return false;
          }
          return true;
        }
      });
      
      const link = document.createElement('a');
      link.download = `note-${props.note.title || 'untitled'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  }
}
</script>

<template>
  <!-- Zen Mode Overlay -->
  <Teleport to="body">
      <div v-if="isZenMode" class="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 transition-opacity duration-500">
          <button 
            @click="toggleZenMode"
            class="absolute top-8 right-8 text-gray-400 hover:text-gray-800 transition-colors"
            title="Exit Zen Mode"
          >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
                <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
             </svg>
          </button>
          
          <div class="w-full max-w-3xl h-full flex flex-col">
              <input 
                type="text" 
                :value="note.title"
                @input="updateTitle"
                placeholder="Untitled"
                class="bg-transparent border-none outline-none font-bold text-4xl text-gray-800 placeholder-gray-300 mb-8 text-center"
              />
              <textarea
                v-model="input"
                class="w-full flex-1 resize-none border-none outline-none bg-transparent text-gray-700 text-xl leading-relaxed p-0 focus:ring-0"
                placeholder="Type something..."
              ></textarea>
          </div>
      </div>
  </Teleport>

  <div ref="cardRef" class="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden transition-all duration-300 group/card relative">
    
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
      
    <!-- Export Button -->
      <button 
          @click="exportCard"
          class="text-gray-300 hover:text-indigo-500 opacity-0 group-hover/card:opacity-100 transition-all"
          title="Export as Image"
          v-if="!note.isCollapsed"
      >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
      </button>

      <!-- Zen Mode Button -->
      <button 
        @click="toggleZenMode"
        class="ml-2 text-gray-300 hover:text-indigo-500 opacity-0 group-hover/card:opacity-100 transition-all"
        title="Zen Mode"
      >
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 8.201 2.665 9.336 6.404.18.596.18 1.23 0 1.826C18.201 15.015 14.257 17.68 10 17.68c-4.257 0-8.201-2.665-9.336-6.404.18-.596.18-1.23 0 1.826zM10 14.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" clip-rule="evenodd" />
         </svg>
      </button>

      <button 
        @click="handleDeleteNote"
        class="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-all"
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

      <!-- Tags Area -->
      <div class="mt-3 pt-2 border-t border-gray-50 flex flex-wrap items-center gap-2">
        <div 
          v-for="tag in note.tags" 
          :key="tag"
          class="bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded-full flex items-center group/tag"
        >
          <span class="mr-1">#</span>{{ tag }}
          <button 
            @click="removeTag(tag)"
            class="ml-1 text-indigo-400 hover:text-indigo-800 opacity-0 group-hover/tag:opacity-100 w-3 h-3 flex items-center justify-center transition-opacity"
          >
            &times;
          </button>
        </div>
        
        <div class="relative flex items-center">
          <span class="absolute left-2 text-gray-400 text-xs pointer-events-none">#</span>
          <input 
            v-model="newTagInput"
            @keydown.enter.prevent="handleAddTag"
            @blur="handleAddTag"
            type="text" 
            placeholder="tag" 
            class="bg-gray-50 hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-indigo-300 text-xs rounded-full pl-4 pr-2 py-1 w-20 focus:w-32 transition-all outline-none text-gray-600 placeholder-gray-400"
          />
        </div>
      </div>
    </div>
  </div>
</template>
