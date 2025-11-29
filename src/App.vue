<script setup lang="ts">
import BlockList from './components/BlockList.vue';
import UIConfigPanel from './components/UIConfigPanel.vue';
import DecorationLayer from './components/DecorationLayer.vue'; // Import Decoration Layer
import ConfirmDialog from './components/ConfirmDialog.vue'; // Import ConfirmDialog
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
  <div class="min-h-screen transition-colors duration-300 relative" :style="appStyles" style="background-color: var(--app-bg);">
    <!-- Decoration Layer Background -->
    <DecorationLayer />
    
    <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3 mb-4 flex justify-between items-center transition-all duration-300">
      <h1 class="text-xl font-bold text-gray-800 flex items-center gap-2">
        <span class="w-6 h-6 bg-indigo-600 rounded text-white flex items-center justify-center text-xs shadow-md">B</span>
        BlockNote
      </h1>
      <button 
        @click="uiStore.toggleEditMode"
        class="text-sm font-medium px-3 py-1.5 rounded-full transition-all shadow-sm hover:shadow"
        :class="uiStore.isEditing ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-500 hover:bg-gray-50'"
      >
        {{ uiStore.isEditing ? 'Done' : 'Customize' }}
      </button>
    </div>
    
    <Transition name="slide-fade">
      <UIConfigPanel v-if="uiStore.isEditing" />
    </Transition>

    <div class="px-4 relative z-10">
      <BlockList />
    </div>
    
    <ConfirmDialog />
  </div>
</template>

<style>
/* Global Transitions */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* Note Card Dynamic Styles */
.bg-white {
    background-color: var(--block-bg, #ffffff) !important;
}
.text-gray-700 {
    color: var(--block-color, #374151) !important;
}
.rounded-lg {
    border-radius: var(--block-radius, 8px) !important;
}
.text-indigo-600 {
    color: var(--tag-color, #4f46e5) !important;
}
.bg-indigo-50 {
    /* Create a lighter version of tag color automatically? 
       For now just keep simple or use opacity if supported by browser logic 
       or just rely on tag-color for text and default bg */
    background-color: color-mix(in srgb, var(--tag-color, #4f46e5) 10%, white) !important;
}

/* Block Width Control */
.max-w-3xl {
    max-width: var(--block-width, 48rem) !important;
}
</style>
