<script setup lang="ts">
import { ref, computed, nextTick, Teleport } from 'vue';
import { useNoteStore } from '../stores/noteStore';
import { useUIStore } from '../stores/uiStore';
import HoverPreviewPopover from '../components/HoverPreviewPopover.vue';
import { v4 as uuidv4 } from 'uuid';
import type { FilterTemplate } from '../types/models';
import { useI18n } from '../composables/useI18n';

const store = useNoteStore();
const uiStore = useUIStore();
const { t } = useI18n();

const selectedTemplateId = ref<string | null>(null);
const newTemplateName = ref('');
const searchQuery = ref('');
const templateSortOrder = ref<'manual' | 'usage' | 'time' | 'name'>('manual');
const showStats = ref(false);

// 模板组重命名相关
const editingGroupName = ref<string | null>(null);
const editingGroupNameValue = ref('');

// 模板重命名相关
const editingTemplateId = ref<string | null>(null);
const editingTemplateName = ref('');
const showRenameTemplateDialog = ref(false);

// Hover Preview Logic (for Quick Preview Mode)
const hoveredTemplate = ref<FilterTemplate | null>(null);

// --- Computed ---
const selectedTemplate = computed(() => store.templates.find(t => t.id === selectedTemplateId.value));

// Filtered and sorted templates
const filteredTemplates = computed(() => {
    let result = store.templates;
    
    // Apply search filter
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(t => t.name.toLowerCase().includes(query));
    }
    
    // Apply sorting
    if (templateSortOrder.value === 'name') {
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (templateSortOrder.value === 'usage') {
        result = [...result].sort((a, b) => {
            const countA = store.getTemplateMatchCount(a.id);
            const countB = store.getTemplateMatchCount(b.id);
            return countB - countA;
        });
    } else if (templateSortOrder.value === 'time') {
        // Note: templates don't have createdAt, so we'll use array index as proxy
        // In a real implementation, you'd want to add createdAt to FilterTemplate
        result = [...result].reverse();
    }
    // 'manual' means keep original order
    
    return result;
});

const groupedFilteredTemplates = computed(() => {
    const generalKey = t('common.general');
    const groups: Record<string, typeof filteredTemplates.value> = { [generalKey]: [] };
    filteredTemplates.value.forEach(t => {
        const g = t.group || generalKey;
        if (!groups[g]) groups[g] = [];
        groups[g].push(t);
    });
    return groups;
});

const groupNamesFiltered = computed(() => {
    const keys = Object.keys(groupedFilteredTemplates.value);
    return keys.sort((a, b) => {
        const generalKey = t('common.general');
        if (a === generalKey) return -1;
        if (b === generalKey) return 1;
        return a.localeCompare(b);
    });
});

// --- Actions ---
function createTemplate() {
    if (newTemplateName.value.trim()) {
        store.createTemplate(newTemplateName.value.trim());
        newTemplateName.value = '';
        if (store.selectedTemplateIds.length > 0) {
             selectedTemplateId.value = store.selectedTemplateIds[0];
        }
    }
}

function deleteTemplate(id: string) {
    if (confirm(t('templateManager.deleteTemplate'))) {
        store.deleteTemplate(id);
        if (selectedTemplateId.value === id) {
            selectedTemplateId.value = null;
        }
    }
}

// --- Tag Management ---
function isTagSelected(tag: string): boolean {
    return selectedTemplate.value?.filterRules.includeTags.includes(tag) || false;
}

function toggleTag(tag: string) {
    if (!selectedTemplate.value) return;
    
    const currentTags = [...selectedTemplate.value.filterRules.includeTags];
    if (currentTags.includes(tag)) {
        store.updateTemplate(selectedTemplate.value.id, {
            filterRules: { ...selectedTemplate.value.filterRules, includeTags: currentTags.filter(t => t !== tag) }
        });
    } else {
        store.updateTemplate(selectedTemplate.value.id, {
            filterRules: { ...selectedTemplate.value.filterRules, includeTags: [...currentTags, tag] }
        });
    }
}

function duplicateTemplate(id: string) {
    const template = store.templates.find(t => t.id === id);
    if (!template) return;
    
    const newTemplate: typeof template = {
        ...template,
        id: uuidv4(),
        name: `${template.name} Copy`
    };
    store.templates.push(newTemplate);
    selectedTemplateId.value = newTemplate.id;
}

// 模板组重命名
function startRenameGroup(groupName: string) {
    const generalKey = t('common.general');
    // 不允许重命名 General 组
    if (groupName === generalKey) return;
    
    editingGroupName.value = groupName;
    editingGroupNameValue.value = groupName;
    nextTick(() => {
        const input = document.getElementById(`rename-group-input-${groupName}`) as HTMLInputElement;
        if (input) {
            input.focus();
            input.select();
        }
    });
}

function confirmRenameGroup() {
    if (!editingGroupName.value || !editingGroupNameValue.value.trim()) {
        cancelRenameGroup();
        return;
    }
    
    const oldName = editingGroupName.value;
    const newName = editingGroupNameValue.value.trim();
    
    if (oldName !== newName && newName) {
        // 更新所有属于该组的模板
        store.templates.forEach(template => {
            if (template.group === oldName) {
                store.updateTemplate(template.id, { group: newName });
            }
        });
    }
    
    cancelRenameGroup();
}

function cancelRenameGroup() {
    editingGroupName.value = null;
    editingGroupNameValue.value = '';
}

// 模板重命名
function startRenameTemplate(id: string) {
    const template = store.templates.find(t => t.id === id);
    if (template) {
        editingTemplateId.value = id;
        editingTemplateName.value = template.name;
        showRenameTemplateDialog.value = true;
    }
}

function confirmRenameTemplate() {
    if (!editingTemplateId.value || !editingTemplateName.value.trim()) {
        cancelRenameTemplate();
        return;
    }
    
    const template = store.templates.find(t => t.id === editingTemplateId.value);
    if (template && template.name !== editingTemplateName.value.trim()) {
        store.updateTemplate(editingTemplateId.value, { name: editingTemplateName.value.trim() });
    }
    
    cancelRenameTemplate();
}

function cancelRenameTemplate() {
    showRenameTemplateDialog.value = false;
    editingTemplateId.value = null;
    editingTemplateName.value = '';
}

</script>

<template>
  <div class="flex h-full bg-white">
      <!-- Left Sidebar: Template List -->
      <div class="w-64 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
          <div class="p-4 border-b border-gray-200 bg-white">
              <div class="flex items-center justify-between mb-2">
                  <h2 class="font-bold text-lg text-gray-800">{{ t('templateManager.templates') }}</h2>
                  <button
                      @click="showStats = !showStats"
                      class="w-6 h-6 rounded border text-[10px] flex items-center justify-center transition-colors"
                      :class="showStats ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-400 border-gray-300'"
                      :title="t('templateManager.showHideStatistics')"
                  >
                      #
                  </button>
              </div>
              <div class="mt-2 flex gap-2">
                  <input 
                    v-model="newTemplateName" 
                    :placeholder="t('placeholder.newTemplateName')"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    @keydown.enter="createTemplate"
                  />
                  <button @click="createTemplate" class="bg-indigo-600 text-white px-2.5 py-1 rounded text-sm hover:bg-indigo-700">+</button>
              </div>
              <!-- Search -->
              <div class="mt-2">
                  <input 
                    v-model="searchQuery" 
                    :placeholder="t('placeholder.searchTemplates')"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                  />
              </div>
              <!-- Sort -->
              <div class="mt-2">
                  <select 
                    v-model="templateSortOrder"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                  >
                      <option value="manual">{{ t('templateManager.sortManual') }}</option>
                      <option value="name">{{ t('templateManager.sortName') }}</option>
                      <option value="usage">{{ t('templateManager.sortUsage') }}</option>
                      <option value="time">{{ t('templateManager.sortTime') }}</option>
                  </select>
              </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2 space-y-4">
              <div v-for="group in groupNamesFiltered" :key="group">
                  <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center justify-between group">
                      <div class="flex items-center gap-2 min-w-0 flex-1">
                          <span v-if="editingGroupName !== group" class="truncate">{{ group }}</span>
                          <input
                            v-else
                            :id="`rename-group-input-${group}`"
                            v-model="editingGroupNameValue"
                            @keydown.enter="confirmRenameGroup"
                            @keydown.esc="cancelRenameGroup"
                            @blur="confirmRenameGroup"
                            class="text-xs border border-indigo-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                            @click.stop
                          />
                      </div>
                      <button 
                        v-if="editingGroupName !== group && group !== t('common.general')"
                        @click.stop="startRenameGroup(group)" 
                        class="text-gray-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        :title="t('btn.edit')"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                          </svg>
                      </button>
                  </div>
                  <div class="space-y-1">
                      <div 
                        v-for="tpl in groupedFilteredTemplates[group]" 
                        :key="tpl.id"
                        @click="selectedTemplateId = tpl.id"
                        @mouseenter="uiStore.quickPreviewMode && (hoveredTemplate = tpl)"
                        @mouseleave="uiStore.quickPreviewMode && (hoveredTemplate = null)"
                        class="px-3 py-2 rounded cursor-pointer flex justify-between items-center group transition-colors"
                        :class="selectedTemplateId === tpl.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-700'"
                      >
                          <div class="flex items-center gap-2 flex-1 min-w-0">
                              <span class="truncate">{{ tpl.name }}</span>
                              <span v-if="showStats" class="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                                  ({{ store.getTemplateMatchCount(tpl.id) }})
                              </span>
                          </div>
                          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button @click.stop="startRenameTemplate(tpl.id)" class="text-gray-400 hover:text-indigo-600 p-1" :title="t('btn.edit')">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                  </svg>
                              </button>
                              <button @click.stop="duplicateTemplate(tpl.id)" class="text-gray-400 hover:text-indigo-600 p-1" :title="t('templateManager.duplicate')">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                                      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                                      <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                                  </svg>
                              </button>
                              <button @click.stop="deleteTemplate(tpl.id)" class="text-gray-400 hover:text-red-500 p-1">
                                  &times;
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <!-- Right Main: Template Editor -->
      <div class="flex-1 flex flex-col h-full overflow-hidden bg-gray-50/30">
          <div v-if="selectedTemplate" class="h-full flex flex-col">
              
              <!-- Editor Header -->
              <div class="p-6 border-b border-gray-200 bg-white shadow-sm z-10">
                  <div class="flex justify-between items-start mb-4">
                      <div>
                          <h1 class="text-2xl font-bold text-gray-900">{{ selectedTemplate.name }}</h1>
                          <div class="flex items-center gap-2 mt-2 text-sm text-gray-500">
                              <span>Group:</span>
                              <span>{{ selectedTemplate.group || t('common.general') }}</span>
                          </div>
                          <!-- Statistics -->
                          <div v-if="showStats" class="mt-2 text-xs text-gray-500">
                              {{ t('templateManager.matches') }}: <span class="font-medium text-gray-700">{{ store.getTemplateMatchCount(selectedTemplate.id) }}</span> {{ t('status.notes') }}
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Tag Selection Area (Transfer Style) -->
              <div class="flex-1 flex overflow-hidden p-6 gap-6">
                  
                  <!-- Left: Available Tags -->
                  <div class="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div class="p-3 border-b border-gray-200 bg-gray-50 font-medium text-gray-700 flex justify-between items-center">
                          <span>{{ t('templateManager.availableTags') }}</span>
                          <span class="text-xs text-gray-500">{{ t('templateManager.clickToAdd') }}</span>
                      </div>
                      <div class="flex-1 overflow-y-auto p-4 space-y-6">
                          
                          <!-- Uncategorized -->
                          <div v-if="store.uncategorizedTags.length > 0">
                              <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Uncategorized</div>
                              <div class="flex flex-wrap gap-2">
                                  <button 
                                    v-for="tag in store.uncategorizedTags" 
                                    :key="tag"
                                    @click="!isTagSelected(tag) && toggleTag(tag)"
                                    class="text-sm px-3 py-1 rounded-full border transition-all text-left"
                                    :class="isTagSelected(tag) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600'"
                                  >
                                      {{ tag }}
                                  </button>
                              </div>
                          </div>

                          <!-- Groups -->
                          <div v-for="group in store.tagGroups" :key="group.id">
                              <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{{ group.name }}</div>
                              <div class="flex flex-wrap gap-2">
                                  <button 
                                    v-for="tag in group.tags" 
                                    :key="tag"
                                    @click="!isTagSelected(tag) && toggleTag(tag)"
                                    class="text-sm px-3 py-1 rounded-full border transition-all text-left"
                                    :class="isTagSelected(tag) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600'"
                                  >
                                      {{ tag }}
                                  </button>
                              </div>
                          </div>

                      </div>
                  </div>

                  <!-- Arrow Icon (Visual) -->
                  <div class="flex flex-col justify-center text-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                      </svg>
                  </div>

                  <!-- Right: Selected Tags -->
                  <div class="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                       <div class="p-3 border-b border-gray-200 bg-indigo-50 font-medium text-indigo-900 flex justify-between items-center">
                          <span>{{ t('templateManager.selectedTags') }}</span>
                          <span class="text-xs text-indigo-600">{{ t('templateManager.clickToRemove') }}</span>
                      </div>
                      <div class="flex-1 overflow-y-auto p-4">
                          <div v-if="selectedTemplate.filterRules.includeTags.length === 0" class="text-center text-gray-400 mt-10">
                              {{ t('templateManager.noTagsSelected') }}.
                          </div>
                          <div class="flex flex-wrap gap-2">
                              <button 
                                v-for="tag in selectedTemplate.filterRules.includeTags" 
                                :key="tag"
                                @click="toggleTag(tag)"
                                class="text-sm px-3 py-1 rounded-full border bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors group flex items-center gap-1"
                              >
                                  {{ tag }}
                                  <span class="text-indigo-400 group-hover:text-red-400">&times;</span>
                              </button>
                          </div>
                      </div>
                  </div>

              </div>

          </div>

          <div v-else class="h-full flex flex-col items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mb-4 opacity-20">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p>{{ t('templateManager.selectTemplateToEdit') }}</p>
          </div>
      </div>

      <!-- 重命名模板对话框 -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="showRenameTemplateDialog" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" @click="cancelRenameTemplate"></div>

            <!-- Modal -->
            <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all scale-100" @click.stop>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                {{ t('templateManager.renameTemplate') }}
              </h3>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ t('templateManager.newTemplateName') }}
                </label>
                <input
                  v-model="editingTemplateName"
                  type="text"
                  class="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  @keydown.enter="confirmRenameTemplate"
                  @keydown.esc="cancelRenameTemplate"
                  autofocus
                />
              </div>
              
              <div class="flex items-center justify-end gap-3">
                <button 
                  @click="cancelRenameTemplate"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  {{ t('btn.cancel') }}
                </button>
                <button 
                  @click="confirmRenameTemplate"
                  class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                >
                  {{ t('btn.confirm') }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Hover Preview Popover -->
      <HoverPreviewPopover
          v-if="uiStore.quickPreviewMode && hoveredTemplate"
          type="template"
          :data="hoveredTemplate"
          position="follow"
      />
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .transform,
.modal-leave-active .transform {
  transition: transform 0.2s ease;
}

.modal-enter-from .transform,
.modal-leave-to .transform {
  transform: scale(0.95);
}
</style>
