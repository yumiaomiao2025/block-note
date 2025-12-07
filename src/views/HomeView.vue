<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import BlockList from '../components/BlockList.vue';
import UIConfigPanel from '../components/UIConfigPanel.vue';
import { useUIStore } from '../stores/uiStore';
import { useNoteStore } from '../stores/noteStore';

const uiStore = useUIStore();
const store = useNoteStore();

// --- Left Sidebar Logic (Templates) ---
const groupedTemplates = computed(() => {
    const groups: Record<string, typeof store.templates> = { 'General': [] };
    store.templates.forEach(t => {
        const g = t.group || 'General';
        if (!groups[g]) groups[g] = [];
        groups[g].push(t);
    });
    return groups;
});

const groupNames = computed(() => {
    const keys = Object.keys(groupedTemplates.value);
    return keys.sort((a, b) => {
        if (a === 'General') return -1;
        if (b === 'General') return 1;
        return a.localeCompare(b);
    });
});

function switchTemplate(id: string) {
    store.switchTemplate(id);
    // Clear secondary filter when switching main template
    store.secondaryFilterTags = [];
}

function clearTemplate() {
    store.clearFilter();
    store.secondaryFilterTags = [];
}

// Hover Tooltip Logic
const hoveredTemplateId = ref<string | null>(null);
const showTooltip = ref(false);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

function onTemplateMouseEnter(id: string) {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoveredTemplateId.value = id;
    hoverTimer = setTimeout(() => {
        if (hoveredTemplateId.value === id) {
            showTooltip.value = true;
        }
    }, 2000); // 2 seconds delay
}

function onTemplateMouseLeave() {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoveredTemplateId.value = null;
    showTooltip.value = false;
}

const hoveredTemplateTags = computed(() => {
    if (!hoveredTemplateId.value) return [];
    const tpl = store.templates.find(t => t.id === hoveredTemplateId.value);
    return tpl ? tpl.filterRules.includeTags : [];
});

onUnmounted(() => {
    if (hoverTimer) clearTimeout(hoverTimer);
});


// --- Right Sidebar Logic (Light Tags) ---
// We need lightTags from the notes visible under current TEMPLATE (ignoring secondary filter)
const candidateNotes = computed(() => {
    let result = store.notes;
    if (store.isTemplateEnabled && store.activeFilter.includeTags.length > 0) {
       result = result.filter(note => {
         return store.activeFilter.includeTags.every(tag => note.tags.includes(tag));
       });
    }
    return result;
});

const topTags = computed(() => {
    // 从轻标签系统读取标签列表
    const systemTags = store.lightTagSystem || [];
    
    // 统计使用频率用于排序（只统计当前候选笔记中的使用情况）
    const counts = new Map<string, number>();
    candidateNotes.value.forEach(note => {
        if (note.lightTags) {
             note.lightTags.forEach(tag => {
                counts.set(tag, (counts.get(tag) || 0) + 1);
            });
        }
    });
    
    // 按使用频率排序，但只返回系统中存在的标签
    return systemTags
        .map(tag => [tag, counts.get(tag) || 0] as [string, number])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(e => e[0]);
});

function toggleSecondaryTag(tag: string) {
    if (store.secondaryFilterTags.includes(tag)) {
        store.secondaryFilterTags = store.secondaryFilterTags.filter(t => t !== tag);
    } else {
        store.secondaryFilterTags.push(tag);
    }
}

const isEditingLightTags = ref(false);

function renameLightTag(oldTag: string) {
    const newTag = prompt('Rename tag:', oldTag);
    if (newTag && newTag.trim() !== oldTag) {
        store.renameTagGlobal(oldTag, newTag.trim());
    }
}

function deleteLightTag(tag: string) {
    if (confirm(`Delete tag "${tag}" globally?`)) {
        store.deleteLightTagGlobal(tag);
        // Remove from filter if present
        if (store.secondaryFilterTags.includes(tag)) {
            toggleSecondaryTag(tag);
        }
    }
}

</script>

<template>
  <div class="flex h-full w-full relative bg-white/50 overflow-hidden">
    
    <!-- Left Sidebar: Templates -->
    <div class="w-56 flex-shrink-0 border-r border-gray-200 bg-white/80 backdrop-blur flex flex-col h-full">
        <div class="p-4 border-b border-gray-100 flex justify-between items-center">
             <h2 class="font-bold text-gray-800 text-lg tracking-tight">Templates</h2>
             <div class="flex gap-1">
                 <button 
                   @click="store.isTemplateEnabled = !store.isTemplateEnabled"
                   class="w-4 h-4 rounded border text-[10px] flex items-center justify-center transition-colors"
                   :class="store.isTemplateEnabled ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-400 border-gray-300'"
                   title="Enable/Disable Templates Filter"
                 >
                   T
                 </button>
                 <button 
                   @click="uiStore.showNormalTags = !uiStore.showNormalTags"
                   class="w-4 h-4 rounded border text-[10px] flex items-center justify-center transition-colors"
                   :class="uiStore.showNormalTags ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-400 border-gray-300'"
                   title="Show/Hide Tags on Cards"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 8.201 2.665 9.336 6.404.18.596.18 1.23 0 1.826C18.201 15.015 14.257 17.68 10 17.68c-4.257 0-8.201-2.665-9.336-6.404.18-.596.18-1.23 0 1.826zM10 14.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" clip-rule="evenodd" />
                   </svg>
                 </button>
             </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar" :class="{ 'opacity-50 pointer-events-none': !store.isTemplateEnabled }">
             <!-- All Notes -->
             <div 
                @click="clearTemplate"
                class="px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium flex items-center gap-2"
                :class="!store.currentTemplateId ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'hover:bg-gray-50 text-gray-600'"
             >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 opacity-70">
                  <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clip-rule="evenodd" />
                </svg>
                All Notes
             </div>

             <!-- Groups -->
             <div v-for="group in groupNames" :key="group">
                  <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-2">{{ group }}</div>
                  <div class="space-y-1">
                      <div 
                        v-for="tpl in groupedTemplates[group]" 
                        :key="tpl.id"
                        @click="switchTemplate(tpl.id)"
                        @mouseenter="onTemplateMouseEnter(tpl.id)"
                        @mouseleave="onTemplateMouseLeave"
                        class="px-3 py-2 rounded-lg cursor-pointer relative group/item transition-all duration-200 text-sm font-medium"
                        :class="store.currentTemplateId === tpl.id ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'hover:bg-gray-50 text-gray-600'"
                      >
                          <span class="truncate block">{{ tpl.name }}</span>
                          
                          <!-- Hover Tooltip -->
                          <Teleport to="body">
                              <div 
                                v-if="showTooltip && hoveredTemplateId === tpl.id"
                                class="fixed z-[9999] bg-gray-900 text-white text-xs rounded p-3 w-48 shadow-xl backdrop-blur pointer-events-none transition-opacity duration-200"
                                :style="{ 
                                    left: '14rem', // Approx width of sidebar
                                    top: '50%', // Centered vertically roughly or tracking mouse would be better but hard without event
                                    transform: 'translateY(-50%)'
                                }" 
                                ref="tooltipRef"
                              >
                                  <div class="font-bold mb-2 border-b border-white/10 pb-1 text-gray-300">Included Tags</div>
                                  <div class="flex flex-wrap gap-1.5">
                                      <span v-for="tag in hoveredTemplateTags" :key="tag" class="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{{ tag }}</span>
                                      <span v-if="hoveredTemplateTags.length === 0" class="italic opacity-50">No specific tags</span>
                                  </div>
                              </div>
                          </Teleport>
                      </div>
                  </div>
              </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-w-0 flex flex-col relative h-full overflow-hidden">
        <Transition name="slide-fade">
          <UIConfigPanel v-if="uiStore.isEditing" class="absolute right-4 top-4 z-50 shadow-xl max-h-[90vh] overflow-y-auto" />
        </Transition>

        <div class="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar relative z-0">
          <!-- Secondary Filter Indicator (if active) -->
          <div v-if="store.secondaryFilterTags.length > 0" class="mb-6 flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
              <span class="text-xs font-bold text-indigo-400 uppercase tracking-wide mr-2">Filtering +</span>
              <TransitionGroup name="list" tag="div" class="flex flex-wrap gap-2">
                  <span 
                    v-for="tag in store.secondaryFilterTags" 
                    :key="tag"
                    class="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium"
                  >
                      {{ tag }}
                      <button @click="toggleSecondaryTag(tag)" class="hover:text-red-500 rounded-full hover:bg-indigo-200 w-4 h-4 flex items-center justify-center transition-colors">&times;</button>
                  </span>
              </TransitionGroup>
              <button @click="store.secondaryFilterTags = []" class="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">Clear All</button>
          </div>

          <BlockList />
        </div>
    </div>

    <!-- Right Sidebar: Light Tags -->
    <div class="w-60 flex-shrink-0 border-l border-gray-200 bg-white/80 backdrop-blur flex flex-col h-full">
        <div class="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-2">
             <div class="flex justify-between items-start">
                 <div>
                     <h2 class="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-indigo-500">
                          <path fill-rule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5zM6 7a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                        </svg>
                        Quick Filter
                     </h2>
                     <p class="text-[10px] text-gray-400 mt-1">Refine by light tags</p>
                 </div>
                 <div class="flex gap-1">
                     <button 
                       @click="store.isLightFilterEnabled = !store.isLightFilterEnabled"
                       class="w-4 h-4 rounded border text-[10px] flex items-center justify-center transition-colors"
                       :class="store.isLightFilterEnabled ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-400 border-gray-300'"
                       title="Enable/Disable Light Filter"
                     >
                       L
                     </button>
                     <button 
                       @click="uiStore.showLightTags = !uiStore.showLightTags"
                       class="w-4 h-4 rounded border text-[10px] flex items-center justify-center transition-colors"
                       :class="uiStore.showLightTags ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-400 border-gray-300'"
                       title="Show/Hide Light Tags on Cards"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                          <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 8.201 2.665 9.336 6.404.18.596.18 1.23 0 1.826C18.201 15.015 14.257 17.68 10 17.68c-4.257 0-8.201-2.665-9.336-6.404.18-.596.18-1.23 0 1.826zM10 14.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" clip-rule="evenodd" />
                       </svg>
                     </button>
                 </div>
             </div>
             
             <div class="flex justify-end">
                 <button 
                    @click="isEditingLightTags = !isEditingLightTags"
                    class="text-[10px] px-2 py-0.5 rounded border transition-colors"
                    :class="isEditingLightTags ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-400 border-gray-200 hover:text-indigo-600'"
                 >
                    {{ isEditingLightTags ? 'Done Editing' : 'Edit Tags' }}
                 </button>
             </div>
        </div>
        <div class="flex-1 overflow-y-auto p-3 custom-scrollbar" :class="{ 'opacity-50 pointer-events-none': !store.isLightFilterEnabled && !isEditingLightTags }">
            <div class="flex flex-wrap gap-2">
                <div 
                    v-for="tag in topTags" 
                    :key="tag"
                    class="relative group/tag"
                >
                    <button 
                        @click="!isEditingLightTags && toggleSecondaryTag(tag)"
                        class="text-xs px-2.5 py-1 rounded-md border transition-all text-left break-all flex items-center gap-1"
                        :class="[
                            isEditingLightTags ? 'pr-1 cursor-default bg-white text-gray-600 border-dashed border-gray-300' : '',
                            !isEditingLightTags && store.secondaryFilterTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm'
                        ]"
                    >
                        {{ tag }}
                        
                        <!-- Edit Controls -->
                        <div v-if="isEditingLightTags" class="flex items-center ml-1 pl-1 border-l border-gray-200 gap-1">
                            <span @click.stop="renameLightTag(tag)" class="text-gray-400 hover:text-indigo-600 cursor-pointer p-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                                  <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                  <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                                </svg>
                            </span>
                            <span @click.stop="deleteLightTag(tag)" class="text-gray-400 hover:text-red-600 cursor-pointer p-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                            </span>
                        </div>
                    </button>
                </div>

                <div v-if="topTags.length === 0" class="text-xs text-gray-400 w-full text-center mt-8 flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 opacity-30">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a22.53 22.53 0 003.744-3.744c.542-.826.369-1.908-.33-2.607L9.568 3z" />
                    </svg>
                    <span>No tags available</span>
                </div>
            </div>
        </div>
    </div>

  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}
</style>
