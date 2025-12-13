<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNoteStore } from '../stores/noteStore';
import { useUIStore } from '../stores/uiStore';
import { useI18n } from '../composables/useI18n';

const store = useNoteStore();
const uiStore = useUIStore(); // Although unused in logic, potentially needed for global UI interactions later or template styles
const { t } = useI18n();

const isCollapsed = ref(false);
const isEditingGroups = ref(false);
const isManagingTemplateGroups = ref(false); 
const isEditingTemplateTags = ref(false); // New mode: Select tags for template
const newGroupName = ref('');
const newTemplateName = ref('');
const isCreatingTemplate = ref(false);
const collapsedGroups = ref<string[]>([]);

// --- Computed ---

const currentTemplate = computed(() => store.templates.find(t => t.id === store.currentTemplateId));

const visibleTagGroups = computed(() => {
  if (isManagingTemplateGroups.value) {
    return store.tagGroups;
  }
  
  if (currentTemplate.value && currentTemplate.value.associatedTagGroups && currentTemplate.value.associatedTagGroups.length > 0) {
    return store.tagGroups.filter(g => currentTemplate.value!.associatedTagGroups!.includes(g.id));
  }
  
  return store.tagGroups;
});

const hasUncategorizedTags = computed(() => store.uncategorizedTags.length > 0);

// --- Actions ---

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value;
}

function handleCreateGroup() {
  if (newGroupName.value.trim()) {
    store.createTagGroup(newGroupName.value.trim());
    newGroupName.value = '';
  }
}

function deleteGroup(id: string) {
  const group = store.tagGroups.find(g => g.id === id);
  const message = group 
    ? t('tagManager.deleteTagGroupWarning')
    : t('tagManager.deleteTagGroupNoTags');
  if (confirm(message)) {
    store.deleteTagGroup(id);
  }
}

function toggleFilter(tag: string) {
  // If Editing Template Tags: toggle in/out of current template's filterRules
  if (isEditingTemplateTags.value && currentTemplate.value) {
     const rules = currentTemplate.value.filterRules;
     let newTags = [...rules.includeTags];
     if (newTags.includes(tag)) {
        newTags = newTags.filter(t => t !== tag);
     } else {
        newTags.push(tag);
     }
     store.updateTemplate(currentTemplate.value.id, { 
         filterRules: { ...rules, includeTags: newTags }
     });
     // Sync with active filter immediately to show result? 
     // User wants "template is preset". So yes, update active too.
     store.activeFilter.includeTags = newTags;
     return;
  }

  store.setFilterTag(tag);
}

function handleCreateTemplate() {
  if (newTemplateName.value.trim()) {
    store.createTemplate(newTemplateName.value.trim()); 
    newTemplateName.value = '';
    isCreatingTemplate.value = false;
  }
}

function deleteTemplate(id: string) {
  if (confirm(t('templateManager.deleteTemplate'))) {
    store.deleteTemplate(id);
  }
}

function toggleGroupForTemplate(groupId: string) {
  if (!currentTemplate.value) return;
  
  const currentGroups = currentTemplate.value.associatedTagGroups || [];
  let newGroups = [...currentGroups];
  
  if (newGroups.includes(groupId)) {
    newGroups = newGroups.filter(id => id !== groupId);
  } else {
    newGroups.push(groupId);
  }
  
  store.updateTemplate(currentTemplate.value.id, { associatedTagGroups: newGroups });
}

function isGroupAssociated(groupId: string): boolean {
  if (!currentTemplate.value) return false;
  return currentTemplate.value.associatedTagGroups?.includes(groupId) || false;
}

function toggleGroupCollapse(groupId: string) {
  if (collapsedGroups.value.includes(groupId)) {
    collapsedGroups.value = collapsedGroups.value.filter(id => id !== groupId);
  } else {
    collapsedGroups.value.push(groupId);
  }
}

// --- Tag DnD ---

function onDragStart(event: DragEvent, tag: string, sourceGroupId: string | null) {
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', tag);
        event.dataTransfer.setData('source-group', sourceGroupId || 'uncategorized');
    }
}

function onDrop(event: DragEvent, targetGroupId: string) {
    const tag = event.dataTransfer?.getData('text/plain');
    const sourceGroup = event.dataTransfer?.getData('source-group');
    
    if (tag && sourceGroup) {
        // Remove from source
        if (sourceGroup !== 'uncategorized') {
            store.removeTagFromGroup(sourceGroup, tag);
        }
        // Add to target
        store.addTagToGroup(targetGroupId, tag);
    }
}

// --- Add New Tag to Group ---
const addingTagToGroup = ref<string | null>(null); // Group ID or 'uncategorized'
const newTagInput = ref('');

function startAddTag(groupId: string) {
    addingTagToGroup.value = groupId;
    newTagInput.value = '';
}

function confirmAddTag() {
    if (newTagInput.value.trim()) {
        if (addingTagToGroup.value && addingTagToGroup.value !== 'uncategorized') {
             store.addTagToGroup(addingTagToGroup.value, newTagInput.value.trim());
        }
    }
    addingTagToGroup.value = null;
    newTagInput.value = '';
}

</script>

<template>
  <div 
    class="bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 h-screen sticky top-0"
    :class="[isCollapsed ? 'w-12' : 'w-64']"
  >
    <!-- Header / Collapse Toggle -->
    <div class="p-4 border-b border-gray-200 flex items-center justify-between">
      <span v-if="!isCollapsed" class="font-bold text-gray-700">{{ t('sidebar.explorer') }}</span>
      <button @click="toggleSidebar" class="text-gray-500 hover:text-indigo-600">
        <svg v-if="!isCollapsed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M15.79 14.77a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.04 1.08L11.832 10l3.938 3.71a.75.75 0 01.02 1.06zm-6 0a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.04 1.08L5.832 10l3.938 3.71a.75.75 0 01.02 1.06z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M4.21 14.77a.75.75 0 011.06.02l4.5-4.25a.75.75 0 010-1.08l-4.5-4.25a.75.75 0 01-1.04 1.08L8.168 10 4.23 13.71a.75.75 0 01-.02 1.06zm6 0a.75.75 0 011.06.02l4.5-4.25a.75.75 0 010-1.08l-4.5-4.25a.75.75 0 01-1.04 1.08L14.168 10l-3.938 3.71a.75.75 0 01-.02 1.06z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div v-if="!isCollapsed" class="flex-1 overflow-y-auto p-4 space-y-6">
      
      <!-- Templates Section -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('sidebar.templates') }}</h3>
          <button @click="isCreatingTemplate = !isCreatingTemplate" class="text-gray-400 hover:text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
          </button>
        </div>
        
        <!-- New Template Input -->
        <div v-if="isCreatingTemplate" class="mb-2 flex gap-1">
          <input 
            v-model="newTemplateName" 
            @keydown.enter="handleCreateTemplate"
            :placeholder="t('placeholder.newTemplate')" 
            class="w-full text-sm border rounded px-2 py-1"
          />
        </div>

        <div class="space-y-1">
          <button 
            @click="store.clearFilter"
            class="w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between group"
            :class="[!store.currentTemplateId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100']"
          >
            <span>{{ t('sidebar.allNotes') }}</span>
          </button>

          <div 
            v-for="tpl in store.templates" 
            :key="tpl.id"
            class="flex items-center justify-between group px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
            :class="[store.currentTemplateId === tpl.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600']"
            @click="store.switchTemplate(tpl.id)"
          >
            <span class="truncate">{{ tpl.name }}</span>
            <button @click.stop="deleteTemplate(tpl.id)" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              &times;
            </button>
          </div>
        </div>
      </div>

      <!-- Tag Groups Section -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('sidebar.tags') }}</h3>
          <div class="flex gap-2">
             <!-- Edit Template Tags (Toggle) -->
             <button 
                v-if="store.currentTemplateId"
                @click="isEditingTemplateTags = !isEditingTemplateTags"
                class="text-xs text-gray-400 hover:text-indigo-600"
                :class="{ 'text-indigo-600': isEditingTemplateTags }"
                title="Edit Template Filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
             </button>
             
             <!-- Template Visibility Toggle -->
             <button 
                v-if="store.currentTemplateId"
                @click="isManagingTemplateGroups = !isManagingTemplateGroups"
                class="text-xs text-gray-400 hover:text-indigo-600"
                :class="{ 'text-indigo-600': isManagingTemplateGroups }"
                title="Manage associated groups"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clip-rule="evenodd" />
                </svg>
             </button>

             <!-- Edit Groups Toggle -->
            <button @click="isEditingGroups = !isEditingGroups" class="text-xs text-gray-400 hover:text-indigo-600" :class="{ 'text-indigo-600': isEditingGroups }">
              {{ isEditingGroups ? t('btn.done') : t('btn.edit') }}
            </button>
          </div>
        </div>

        <!-- Group Creation -->
        <div v-if="isEditingGroups" class="mb-3 flex gap-1">
           <input 
            v-model="newGroupName" 
            @keydown.enter="handleCreateGroup"
            :placeholder="t('placeholder.newGroup')" 
            class="w-full text-sm border rounded px-2 py-1"
          />
          <button @click="handleCreateGroup" class="text-indigo-600 px-2 text-sm">+</button>
        </div>

        <div class="space-y-4">
          <!-- Tag Groups -->
          <div 
            v-for="group in visibleTagGroups" 
            :key="group.id" 
            class="group"
            @dragover.prevent
            @drop="onDrop($event, group.id)"
          >
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                 <!-- Collapse Toggle -->
                 <button @click="toggleGroupCollapse(group.id)" class="text-gray-400 hover:text-gray-600">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 transition-transform" :class="{'rotate-[-90deg]': collapsedGroups.includes(group.id)}">
                      <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                   </svg>
                 </button>

                 <!-- Checkbox for template association -->
                 <input 
                   v-if="isManagingTemplateGroups" 
                   type="checkbox" 
                   :checked="isGroupAssociated(group.id)"
                   @change="toggleGroupForTemplate(group.id)"
                   class="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                 />
                 <span class="text-sm font-medium text-gray-700">{{ group.name }}</span>
              </div>
              
              <button v-if="isEditingGroups" @click="deleteGroup(group.id)" class="text-gray-300 hover:text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                   <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            
            <!-- Group Content -->
            <div v-if="!collapsedGroups.includes(group.id)" class="pl-1">
                <div class="flex flex-wrap gap-1.5">
                  <div 
                    v-for="tag in group.tags" 
                    :key="tag"
                    draggable="true"
                    @dragstart="onDragStart($event, tag, group.id)"
                    @click="!isEditingGroups && toggleFilter(tag)"
                    class="text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors select-none flex items-center gap-1"
                    :class="[
                      // Highlight logic: 
                      // 1. If Editing Template: Highlight if IN template rules
                      // 2. Else: Highlight if in ACTIVE filter
                      (isEditingTemplateTags && currentTemplate?.filterRules.includeTags.includes(tag)) ||
                      (!isEditingTemplateTags && store.activeFilter.includeTags.includes(tag))
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'
                    ]"
                  >
                    <!-- Checkmark for Template Edit Mode -->
                    <span v-if="isEditingTemplateTags && currentTemplate?.filterRules.includeTags.includes(tag)" class="text-[10px] leading-none">&check;</span>
                    
                    {{ tag }}
                    <button v-if="isEditingGroups" @click.stop="store.removeTagFromGroup(group.id, tag)" class="text-gray-400 hover:text-red-500">&times;</button>
                  </div>
                </div>
                
                <!-- Add Tag Button -->
                <div class="mt-1">
                    <button v-if="addingTagToGroup !== group.id" @click="startAddTag(group.id)" class="text-[10px] text-gray-400 hover:text-indigo-600 flex items-center gap-1">
                        <span>+ {{ t('tagManager.addTag') }}</span>
                    </button>
                    <div v-else class="flex items-center gap-1">
                        <input 
                            v-model="newTagInput"
                            @keydown.enter="confirmAddTag"
                            @blur="confirmAddTag"
                            class="text-xs border rounded px-1 py-0.5 w-20"
                            autoFocus
                            :placeholder="t('placeholder.tagName')"
                        />
                    </div>
                </div>
            </div>
          </div>

          <!-- Uncategorized -->
          <div v-if="hasUncategorizedTags">
            <div class="text-sm font-medium text-gray-400 mb-1">{{ t('common.uncategorized') }}</div>
            <div class="flex flex-wrap gap-1.5 pl-1">
              <div 
                 v-for="tag in store.uncategorizedTags"
                 :key="tag"
                 draggable="true"
                 @dragstart="onDragStart($event, tag, null)"
                 class="relative group/tag"
              >
                <button
                  @click="toggleFilter(tag)"
                  class="text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors flex items-center gap-1"
                  :class="[
                     (isEditingTemplateTags && currentTemplate?.filterRules.includeTags.includes(tag)) ||
                     (!isEditingTemplateTags && store.activeFilter.includeTags.includes(tag))
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'
                  ]"
                >
                   <span v-if="isEditingTemplateTags && currentTemplate?.filterRules.includeTags.includes(tag)" class="text-[10px] leading-none">&check;</span>
                  {{ tag }}
                </button>
                
                <!-- Quick Assign Menu (Visible in Edit Mode) -->
                 <div v-if="isEditingGroups && store.tagGroups.length > 0" class="absolute left-0 top-full mt-1 z-50 hidden group-hover/tag:block bg-white border shadow-lg rounded p-1 min-w-[100px]">
                   <div class="text-[10px] text-gray-400 px-1">Move to:</div>
                   <button 
                     v-for="g in store.tagGroups" 
                     :key="g.id"
                     @click="store.addTagToGroup(g.id, tag)"
                     class="block w-full text-left px-2 py-1 text-xs hover:bg-indigo-50 text-gray-700 rounded"
                   >
                     {{ g.name }}
                   </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
    
    <!-- Footer / Settings (Collapsed view icons) -->
    <div v-if="isCollapsed" class="flex flex-col items-center py-4 gap-4">
       <button @click="store.clearFilter" class="p-2 rounded-md hover:bg-gray-100 text-gray-500" :title="t('sidebar.allNotes')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clip-rule="evenodd" />
          </svg>
       </button>
    </div>

  </div>
</template>
