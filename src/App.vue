<script setup lang="ts">
import BlockList from './components/BlockList.vue';
import UIConfigPanel from './components/UIConfigPanel.vue';
import { useUIStore } from './stores/uiStore';
import { computed } from 'vue';

const uiStore = useUIStore();

// Computed style object for dynamic CSS variables
const appStyles = computed(() => {
  const { style, layout } = uiStore.currentConfig;
  return {
    '--app-bg': style.appBackgroundColor,
    '--block-bg': style.blockBackgroundColor,
    '--block-color': style.blockFontColor,
    '--block-radius': `${style.blockBorderRadius}px`,
    '--tag-color': style.tagColor,
    '--block-width': `${layout.blockWidth}px`,
  };
});
</script>

<template>
  <div class="min-h-screen transition-colors duration-300" :style="appStyles" style="background-color: var(--app-bg);">
    <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3 mb-4 flex justify-between items-center">
      <h1 class="text-xl font-bold text-gray-800 flex items-center gap-2">
        <span class="w-6 h-6 bg-indigo-600 rounded text-white flex items-center justify-center text-xs">B</span>
        BlockNote
      </h1>
      <button 
        @click="uiStore.toggleEditMode"
        class="text-sm font-medium px-3 py-1.5 rounded-full transition-all"
        :class="uiStore.isEditing ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'"
      >
        {{ uiStore.isEditing ? 'Done' : 'Customize' }}
      </button>
    </div>
    
    <UIConfigPanel />

    <div class="px-4">
      <BlockList />
    </div>
  </div>
</template>
