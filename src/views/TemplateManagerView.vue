<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNoteStore } from '../stores/noteStore';
import { useUIStore } from '../stores/uiStore';
import HoverPreviewPopover from '../components/HoverPreviewPopover.vue';
import { v4 as uuidv4 } from 'uuid';
import type { FilterTemplate } from '../types/models';

const store = useNoteStore();
const uiStore = useUIStore();

const selectedTemplateId = ref<string | null>(null);
const newTemplateName = ref('');
const editingGroupName = ref(false); // For editing the group name directly
const searchQuery = ref('');
const templateSortOrder = ref<'manual' | 'usage' | 'time' | 'name'>('manual');
const isBatchMode = ref(false);
const selectedTemplateIdsForBatch = ref<Set<string>>(new Set());
const showStats = ref(false);
const batchGroupName = ref('');

// Hover Preview Logic (for Quick Preview Mode)
const hoveredTemplate = ref<FilterTemplate | null>(null);

// --- Computed ---
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
    // Ensure General is first
    return keys.sort((a, b) => {
        if (a === 'General') return -1;
        if (b === 'General') return 1;
        return a.localeCompare(b);
    });
});

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
    const groups: Record<string, typeof filteredTemplates.value> = { 'General': [] };
    filteredTemplates.value.forEach(t => {
        const g = t.group || 'General';
        if (!groups[g]) groups[g] = [];
        groups[g].push(t);
    });
    return groups;
});

const groupNamesFiltered = computed(() => {
    const keys = Object.keys(groupedFilteredTemplates.value);
    return keys.sort((a, b) => {
        if (a === 'General') return -1;
        if (b === 'General') return 1;
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
    if (confirm('Delete this template?')) {
        store.deleteTemplate(id);
        if (selectedTemplateId.value === id) {
            selectedTemplateId.value = null;
        }
    }
}

function updateTemplateName(name: string) {
    if (selectedTemplate.value && name.trim()) {
        store.updateTemplate(selectedTemplate.value.id, { name: name.trim() });
    }
}

function updateTemplateGroup(groupName: string) {
    if (selectedTemplate.value) {
        store.updateTemplate(selectedTemplate.value.id, { group: groupName.trim() || undefined });
        editingGroupName.value = false;
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

function toggleBatchSelection(id: string) {
    if (selectedTemplateIdsForBatch.value.has(id)) {
        selectedTemplateIdsForBatch.value.delete(id);
    } else {
        selectedTemplateIdsForBatch.value.add(id);
    }
}

function selectAllTemplates() {
    filteredTemplates.value.forEach(t => {
        selectedTemplateIdsForBatch.value.add(t.id);
    });
}

function deselectAllTemplates() {
    selectedTemplateIdsForBatch.value.clear();
}

function batchDelete() {
    if (selectedTemplateIdsForBatch.value.size === 0) return;
    if (confirm(`Delete ${selectedTemplateIdsForBatch.value.size} template(s)?`)) {
        selectedTemplateIdsForBatch.value.forEach(id => {
            store.deleteTemplate(id);
        });
        selectedTemplateIdsForBatch.value.clear();
        isBatchMode.value = false;
        if (selectedTemplateId.value && selectedTemplateIdsForBatch.value.has(selectedTemplateId.value)) {
            selectedTemplateId.value = null;
        }
    }
}

function batchChangeGroup(groupName: string) {
    if (selectedTemplateIdsForBatch.value.size === 0) return;
    selectedTemplateIdsForBatch.value.forEach(id => {
        store.updateTemplate(id, { group: groupName.trim() || undefined });
    });
    selectedTemplateIdsForBatch.value.clear();
    isBatchMode.value = false;
}

</script>

<template>
  <div class="flex h-full bg-white">
      <!-- Left Sidebar: Template List -->
      <div class="w-64 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
          <div class="p-4 border-b border-gray-200 bg-white">
              <div class="flex items-center justify-between mb-2">
                  <h2 class="font-bold text-lg text-gray-800">Templates</h2>
                  <button
                      @click="showStats = !showStats"
                      class="w-6 h-6 rounded border text-[10px] flex items-center justify-center transition-colors"
                      :class="showStats ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-400 border-gray-300'"
                      title="Show/Hide Statistics"
                  >
                      #
                  </button>
              </div>
              <div class="mt-2 flex gap-2">
                  <input 
                    v-model="newTemplateName" 
                    placeholder="New Template Name"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    @keydown.enter="createTemplate"
                  />
                  <button @click="createTemplate" class="bg-indigo-600 text-white px-2.5 py-1 rounded text-sm hover:bg-indigo-700">+</button>
              </div>
              <!-- Search -->
              <div class="mt-2">
                  <input 
                    v-model="searchQuery" 
                    placeholder="Search templates..."
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                  />
              </div>
              <!-- Sort -->
              <div class="mt-2">
                  <select 
                    v-model="templateSortOrder"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                  >
                      <option value="manual">Manual Order</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="usage">Usage (High to Low)</option>
                      <option value="time">Time (Newest First)</option>
                  </select>
              </div>
              <!-- Batch Mode Toggle -->
              <div class="mt-2 flex items-center gap-2">
                  <button
                      @click="isBatchMode = !isBatchMode; if (!isBatchMode) selectedTemplateIdsForBatch.clear()"
                      class="text-xs px-2 py-1 rounded border transition-colors"
                      :class="isBatchMode ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
                  >
                      {{ isBatchMode ? 'Exit Batch' : 'Batch Mode' }}
                  </button>
                  <div v-if="isBatchMode" class="flex gap-1">
                      <button
                          @click="selectAllTemplates"
                          class="text-xs px-1.5 py-0.5 rounded border bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          title="Select All"
                      >
                          All
                      </button>
                      <button
                          @click="deselectAllTemplates"
                          class="text-xs px-1.5 py-0.5 rounded border bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          title="Deselect All"
                      >
                          None
                      </button>
                  </div>
              </div>
              <!-- Batch Actions -->
              <div v-if="isBatchMode && selectedTemplateIdsForBatch.size > 0" class="mt-2 space-y-1">
                  <button
                      @click="batchDelete"
                      class="w-full text-xs px-2 py-1 rounded border bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  >
                      Delete ({{ selectedTemplateIdsForBatch.size }})
                  </button>
                  <div class="flex gap-1">
                      <input
                          v-model="batchGroupName"
                          @keydown.enter="batchChangeGroup(batchGroupName)"
                          placeholder="Group name..."
                          class="flex-1 text-xs border rounded px-1.5 py-0.5"
                      />
                      <button
                          @click="batchChangeGroup(batchGroupName)"
                          class="text-xs px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                      >
                          Set
                      </button>
                  </div>
              </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2 space-y-4">
              <div v-for="group in groupNamesFiltered" :key="group">
                  <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">{{ group }}</div>
                  <div class="space-y-1">
                      <div 
                        v-for="tpl in groupedFilteredTemplates[group]" 
                        :key="tpl.id"
                        @click="isBatchMode ? toggleBatchSelection(tpl.id) : (selectedTemplateId = tpl.id)"
                        @mouseenter="uiStore.quickPreviewMode && (hoveredTemplate = tpl)"
                        @mouseleave="uiStore.quickPreviewMode && (hoveredTemplate = null)"
                        class="px-3 py-2 rounded cursor-pointer flex justify-between items-center group transition-colors"
                        :class="[
                            isBatchMode && selectedTemplateIdsForBatch.has(tpl.id) ? 'bg-indigo-100 text-indigo-700' : '',
                            !isBatchMode && selectedTemplateId === tpl.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-700'
                        ]"
                      >
                          <div class="flex items-center gap-2 flex-1 min-w-0">
                              <!-- Batch Checkbox -->
                              <div v-if="isBatchMode" class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                                   :class="selectedTemplateIdsForBatch.has(tpl.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'">
                                  <svg v-if="selectedTemplateIdsForBatch.has(tpl.id)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-white">
                                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                  </svg>
                              </div>
                              <span class="truncate">{{ tpl.name }}</span>
                              <span v-if="showStats" class="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                                  ({{ store.getTemplateMatchCount(tpl.id) }})
                              </span>
                          </div>
                          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button @click.stop="duplicateTemplate(tpl.id)" class="text-gray-400 hover:text-indigo-600 p-1" title="Duplicate">
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
                          <input 
                             :value="selectedTemplate.name"
                             @change="(e) => updateTemplateName((e.target as HTMLInputElement).value)"
                             class="text-2xl font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-600 focus:outline-none bg-transparent"
                          />
                          <div class="flex items-center gap-2 mt-2 text-sm text-gray-500">
                              <span>Group:</span>
                              <div v-if="!editingGroupName" @click="editingGroupName = true" class="cursor-pointer hover:text-indigo-600 flex items-center gap-1">
                                  {{ selectedTemplate.group || 'General' }}
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                  </svg>
                              </div>
                              <input 
                                v-else
                                :value="selectedTemplate.group || 'General'"
                                @blur="(e) => updateTemplateGroup((e.target as HTMLInputElement).value)"
                                @keydown.enter="(e) => updateTemplateGroup((e.target as HTMLInputElement).value)"
                                class="border rounded px-1 py-0.5 text-sm"
                                autoFocus
                              />
                          </div>
                          <!-- Statistics -->
                          <div v-if="showStats" class="mt-2 text-xs text-gray-500">
                              Matches: <span class="font-medium text-gray-700">{{ store.getTemplateMatchCount(selectedTemplate.id) }}</span> notes
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Tag Selection Area (Transfer Style) -->
              <div class="flex-1 flex overflow-hidden p-6 gap-6">
                  
                  <!-- Left: Available Tags -->
                  <div class="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div class="p-3 border-b border-gray-200 bg-gray-50 font-medium text-gray-700 flex justify-between items-center">
                          <span>Available Tags</span>
                          <span class="text-xs text-gray-500">Click to Add</span>
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
                          <span>Selected Tags</span>
                          <span class="text-xs text-indigo-600">Click to Remove</span>
                      </div>
                      <div class="flex-1 overflow-y-auto p-4">
                          <div v-if="selectedTemplate.filterRules.includeTags.length === 0" class="text-center text-gray-400 mt-10">
                              No tags selected.
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
              <p>Select a template to edit or create a new one.</p>
          </div>
      </div>

      <!-- Hover Preview Popover -->
      <HoverPreviewPopover
          v-if="uiStore.quickPreviewMode && hoveredTemplate"
          type="template"
          :data="hoveredTemplate"
          position="follow"
      />
  </div>
</template>
