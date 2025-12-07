<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNoteStore } from '../stores/noteStore';
import { useUIStore } from '../stores/uiStore';

const store = useNoteStore();
const uiStore = useUIStore();

const selectedTemplateId = ref<string | null>(null);
const newTemplateName = ref('');
const editingGroupName = ref(false); // For editing the group name directly

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

// --- Actions ---
function createTemplate() {
    if (newTemplateName.value.trim()) {
        store.createTemplate(newTemplateName.value.trim());
        newTemplateName.value = '';
        if (store.currentTemplateId) {
             selectedTemplateId.value = store.currentTemplateId;
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

// --- Theme Actions ---
function captureTheme() {
    if (!selectedTemplate.value) return;
    if (confirm("Update this template to use the currently active UI theme?")) {
        store.updateTemplate(selectedTemplate.value.id, {
             themeConfig: JSON.parse(JSON.stringify(uiStore.currentConfig))
        });
    }
}
</script>

<template>
  <div class="flex h-full bg-white">
      <!-- Left Sidebar: Template List -->
      <div class="w-64 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
          <div class="p-4 border-b border-gray-200 bg-white">
              <h2 class="font-bold text-lg text-gray-800">Templates</h2>
              <div class="mt-2 flex gap-2">
                  <input 
                    v-model="newTemplateName" 
                    placeholder="New Template Name"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    @keydown.enter="createTemplate"
                  />
                  <button @click="createTemplate" class="bg-indigo-600 text-white px-2.5 py-1 rounded text-sm hover:bg-indigo-700">+</button>
              </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2 space-y-4">
              <div v-for="group in groupNames" :key="group">
                  <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">{{ group }}</div>
                  <div class="space-y-1">
                      <div 
                        v-for="tpl in groupedTemplates[group]" 
                        :key="tpl.id"
                        @click="selectedTemplateId = tpl.id"
                        class="px-3 py-2 rounded cursor-pointer flex justify-between items-center group transition-colors"
                        :class="selectedTemplateId === tpl.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-700'"
                      >
                          <span class="truncate">{{ tpl.name }}</span>
                          <button @click.stop="deleteTemplate(tpl.id)" class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            &times;
                          </button>
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
                      </div>
                      <button @click="captureTheme" class="text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 text-gray-600">
                          Capture Current Theme
                      </button>
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
  </div>
</template>
