<script setup lang="ts">
import { ref, computed } from 'vue';
import HomeView from './views/HomeView.vue';
import TagManagerView from './views/TagManagerView.vue';
import TemplateManagerView from './views/TemplateManagerView.vue';
import { useUIStore } from './stores/uiStore';
import DecorationLayer from './components/DecorationLayer.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

const uiStore = useUIStore();

const activeTab = ref('home');

const currentView = computed(() => {
  switch (activeTab.value) {
    case 'tags': return TagManagerView;
    case 'templates': return TemplateManagerView;
    default: return HomeView;
  }
});

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
  <div class="h-screen flex flex-col relative transition-colors duration-300 font-sans text-gray-900 overflow-hidden" :style="appStyles" style="background-color: var(--app-bg);">
    <!-- Decoration Layer Background -->
    <DecorationLayer />

    <!-- Navigation Tabs -->
    <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur shadow-sm border-b border-gray-200 px-4 h-12 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-6 h-full">
            <div class="flex items-center gap-2 font-bold text-gray-800 mr-2 select-none">
                 <span class="w-6 h-6 bg-indigo-600 rounded text-white flex items-center justify-center text-xs shadow-md">B</span>
                 <span class="hidden sm:inline">BlockNote</span>
            </div>
            
            <button 
                @click="activeTab = 'home'"
                class="h-full border-b-2 px-3 text-sm font-medium transition-colors focus:outline-none"
                :class="activeTab === 'home' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
                Home
            </button>
            <button 
                @click="activeTab = 'tags'"
                class="h-full border-b-2 px-3 text-sm font-medium transition-colors focus:outline-none"
                :class="activeTab === 'tags' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
                Tags (Manager)
            </button>
            <button 
                @click="activeTab = 'templates'"
                class="h-full border-b-2 px-3 text-sm font-medium transition-colors focus:outline-none"
                :class="activeTab === 'templates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
                Templates (Manager)
            </button>
        </div>

        <div class="flex items-center gap-2">
            <button 
                @click="uiStore.quickPreviewMode = !uiStore.quickPreviewMode"
                class="text-xs font-medium px-3 py-1.5 rounded-full transition-all shadow-sm hover:shadow focus:outline-none flex items-center gap-1.5"
                :class="uiStore.quickPreviewMode ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
                title="超级预览"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                    <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 8.201 2.665 9.336 6.404.18.596.18 1.23 0 1.826C18.201 15.015 14.257 17.68 10 17.68c-4.257 0-8.201-2.665-9.336-6.404.18-.596.18-1.23 0 1.826zM10 14.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" clip-rule="evenodd" />
                </svg>
                快捷预览
            </button>
            <button 
                @click="uiStore.toggleEditMode"
                class="text-xs font-medium px-3 py-1.5 rounded-full transition-all shadow-sm hover:shadow focus:outline-none"
                :class="uiStore.isEditing ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-500 hover:bg-gray-50'"
              >
                {{ uiStore.isEditing ? 'Done' : 'Customize UI' }}
              </button>
        </div>
    </nav>
    
    <!-- Main Content -->
    <div class="flex-1 relative z-10 flex flex-col overflow-hidden h-[calc(100vh-3rem)]">
        <component :is="currentView" class="h-full w-full" />
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
    background-color: color-mix(in srgb, var(--tag-color, #4f46e5) 10%, white) !important;
}

/* Block Width Control */
.max-w-3xl {
    max-width: var(--block-width, 48rem) !important;
}
</style>
