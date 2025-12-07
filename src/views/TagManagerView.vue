<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNoteStore } from '../stores/noteStore';

const store = useNoteStore();

const selectedGroupId = ref<string | 'uncategorized'>('uncategorized');
const newGroupName = ref('');
const newTagInput = ref('');

// --- Computed ---
const displayedTags = computed(() => {
    if (selectedGroupId.value === 'uncategorized') {
        return store.uncategorizedTags;
    }
    const group = store.tagGroups.find(g => g.id === selectedGroupId.value);
    return group ? group.tags : [];
});

const selectedGroupName = computed(() => {
    if (selectedGroupId.value === 'uncategorized') return 'Uncategorized';
    return store.tagGroups.find(g => g.id === selectedGroupId.value)?.name || 'Unknown';
});

// --- Actions ---
function createGroup() {
    if (newGroupName.value.trim()) {
        store.createTagGroup(newGroupName.value.trim());
        newGroupName.value = '';
    }
}

function deleteGroup(id: string) {
    if (confirm('Delete this group? Tags will become uncategorized.')) {
        store.deleteTagGroup(id);
        if (selectedGroupId.value === id) {
            selectedGroupId.value = 'uncategorized';
        }
    }
}

function createTag() {
    if (!newTagInput.value.trim()) return;
    const tag = newTagInput.value.trim();
    
    if (selectedGroupId.value !== 'uncategorized') {
        store.addTagToGroup(selectedGroupId.value, tag);
    } else {
        alert("Please select a group to create a new tag in.");
        return;
    }
    newTagInput.value = '';
}

function deleteTag(tag: string) {
    if (confirm(`Delete tag "${tag}" from ALL notes and groups?`)) {
        store.deleteTagGlobal(tag);
    }
}

function renameTag(oldTag: string) {
    const newTag = prompt('Rename tag:', oldTag);
    if (newTag && newTag.trim() !== oldTag) {
        store.renameTagGlobal(oldTag, newTag.trim());
    }
}

// --- DnD ---
function onDragStart(event: DragEvent, tag: string) {
    if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', tag);
        event.dataTransfer.setData('source-group', selectedGroupId.value);
    }
}

function onDropGroup(event: DragEvent, targetGroupId: string) {
    const tag = event.dataTransfer?.getData('text/plain');
    const sourceGroupId = event.dataTransfer?.getData('source-group');
    
    if (tag && sourceGroupId) {
        if (targetGroupId === sourceGroupId) return;
        
        // Add to target
        store.addTagToGroup(targetGroupId, tag);
        
        // Remove from source (if source was a group)
        // If source was 'uncategorized', it automatically disappears from uncategorized list when added to a group.
        if (sourceGroupId !== 'uncategorized') {
             store.removeTagFromGroup(sourceGroupId, tag);
        }
    }
}
</script>

<template>
  <div class="flex h-full bg-white">
      <!-- Left Sidebar: Groups -->
      <div class="w-64 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
          <div class="p-4 border-b border-gray-200 bg-white">
              <h2 class="font-bold text-lg text-gray-800">Groups</h2>
              <div class="mt-2 flex gap-2">
                  <input 
                    v-model="newGroupName" 
                    placeholder="New Group Name"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    @keydown.enter="createGroup"
                  />
                  <button @click="createGroup" class="bg-indigo-600 text-white px-2.5 py-1 rounded text-sm hover:bg-indigo-700">+</button>
              </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2 space-y-1">
              <!-- Uncategorized -->
              <div 
                @click="selectedGroupId = 'uncategorized'"
                class="px-3 py-2 rounded cursor-pointer flex justify-between items-center transition-colors"
                :class="selectedGroupId === 'uncategorized' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-700'"
              >
                  <div class="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 opacity-70">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                      </svg>
                      <span>Uncategorized</span>
                  </div>
                  <span class="text-xs bg-white/50 px-1.5 rounded-full text-gray-600">{{ store.uncategorizedTags.length }}</span>
              </div>

              <!-- User Groups -->
              <div 
                v-for="group in store.tagGroups" 
                :key="group.id"
                @click="selectedGroupId = group.id"
                @dragover.prevent
                @drop="onDropGroup($event, group.id)"
                class="px-3 py-2 rounded cursor-pointer flex justify-between items-center group transition-colors"
                :class="selectedGroupId === group.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-700'"
              >
                  <div class="flex items-center gap-2 min-w-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 opacity-70 shrink-0">
                        <path d="M3.75 3a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75H4c.414 0 .75-.336.75-.75v-.5a.75.75 0 00-.75-.75h-.25zM3.75 9a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75H4c.414 0 .75-.336.75-.75v-.5a.75.75 0 00-.75-.75h-.25zM3.75 15a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75H4c.414 0 .75-.336.75-.75v-.5a.75.75 0 00-.75-.75h-.25zM7.5 3a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h9.25a.75.75 0 00.75-.75v-.5a.75.75 0 00-.75-.75H7.5zM6.75 9.75a.75.75 0 01.75-.75h9.25a.75.75 0 01.75.75v.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75v-.5zM6.75 15.75a.75.75 0 01.75-.75h9.25a.75.75 0 01.75.75v.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75v-.5z" />
                      </svg>
                      <span class="truncate">{{ group.name }}</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                       <span class="text-xs bg-white/50 px-1.5 rounded-full text-gray-600">{{ group.tags.length }}</span>
                       <button @click.stop="deleteGroup(group.id)" class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                           &times;
                       </button>
                  </div>
              </div>
          </div>
      </div>

      <!-- Right Main: Tag Pool -->
      <div class="flex-1 flex flex-col h-full overflow-hidden">
          <!-- Header -->
          <div class="p-6 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
              <div>
                  <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      {{ selectedGroupName }}
                      <span class="text-sm font-normal text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">{{ displayedTags.length }} tags</span>
                  </h1>
                  <p class="text-sm text-gray-500 mt-1">Manage tags for this group.</p>
              </div>
              
              <div class="flex items-center gap-2" v-if="selectedGroupId !== 'uncategorized'">
                   <input 
                     v-model="newTagInput" 
                     placeholder="Add new tag..." 
                     class="border rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                     @keydown.enter="createTag"
                   />
                   <button @click="createTag" class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors">
                       Add Tag
                   </button>
              </div>
          </div>

          <!-- Tag Grid -->
          <div class="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <div v-if="displayedTags.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mb-4 opacity-20">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a22.53 22.53 0 003.744-3.744c.542-.826.369-1.908-.33-2.607L9.568 3z" />
                  </svg>
                  <p class="text-lg font-medium text-gray-500">No tags here yet</p>
                  <p class="text-sm mt-1" v-if="selectedGroupId === 'uncategorized'">All your tags are neatly organized in groups!</p>
                  <p class="text-sm mt-1" v-else>Drag uncategorized tags here or create a new one.</p>
              </div>
              
              <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 auto-rows-min">
                  <div 
                    v-for="tag in displayedTags" 
                    :key="tag"
                    draggable="true"
                    @dragstart="onDragStart($event, tag)"
                    class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all group relative flex flex-col cursor-grab active:cursor-grabbing"
                  >
                      <div class="font-medium text-gray-800 truncate mb-4 select-none" :title="tag">{{ tag }}</div>
                      
                      <div class="mt-auto flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-gray-100">
                          <button @click="renameTag(tag)" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 hover:bg-indigo-50 rounded">Rename</button>
                          <button @click="deleteTag(tag)" class="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded">Delete</button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  </div>
</template>
