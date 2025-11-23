<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNoteStore } from '../stores/noteStore';

const store = useNoteStore();
const isCreatingTemplate = ref(false);
const newTemplateName = ref('');

const hasActiveFilter = computed(() => store.activeFilter.includeTags.length > 0);

function toggleFilter(tag: string) {
  store.setFilterTag(tag);
}

function handleCreateTemplate() {
  if (newTemplateName.value.trim()) {
    store.createTemplate(newTemplateName.value.trim());
    newTemplateName.value = '';
    isCreatingTemplate.value = false;
  }
}
</script>

<template>
  <div class="mb-6 space-y-4">
    <!-- Top Row: Templates & Clear -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <!-- All Notes (Reset) -->
        <button 
          @click="store.clearFilter"
          class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors border"
          :class="[!store.currentTemplateId && !hasActiveFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50']"
        >
          All Notes
        </button>

        <!-- Saved Templates -->
        <div v-for="tpl in store.templates" :key="tpl.id" class="flex items-center group">
          <button 
            @click="store.switchTemplate(tpl.id)"
            class="px-3 py-1.5 rounded-l-md text-sm font-medium transition-colors border-y border-l"
            :class="[store.currentTemplateId === tpl.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50']"
          >
            {{ tpl.name }}
          </button>
          <button 
            @click.stop="store.deleteTemplate(tpl.id)"
            class="px-1.5 py-1.5 rounded-r-md text-sm transition-colors border-y border-r border-l-0"
            :class="[store.currentTemplateId === tpl.id ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' : 'bg-white text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-500']"
          >
            &times;
          </button>
        </div>
      </div>

      <!-- Save Current View as Template -->
      <div v-if="hasActiveFilter && !store.currentTemplateId" class="relative">
        <button 
          v-if="!isCreatingTemplate"
          @click="isCreatingTemplate = true"
          class="text-indigo-600 text-sm hover:text-indigo-800 font-medium flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Save View
        </button>
        <div v-else class="flex items-center bg-white shadow-lg rounded-md p-1 border border-gray-200 absolute right-0 z-10">
          <input 
            v-model="newTemplateName"
            @keydown.enter="handleCreateTemplate"
            type="text" 
            placeholder="View Name" 
            class="text-sm border-none outline-none w-32 px-2 py-1"
            autoFocus
          />
          <button @click="handleCreateTemplate" class="text-indigo-600 hover:bg-indigo-50 p-1 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
          <button @click="isCreatingTemplate = false" class="text-gray-400 hover:bg-gray-50 p-1 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Row: Available Tags (Filter) -->
    <div v-if="store.allTags.length > 0" class="flex flex-wrap gap-2 pt-2 border-t border-gray-200/50">
      <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider py-1">Filter:</span>
      <button
        v-for="tag in store.allTags"
        :key="tag"
        @click="toggleFilter(tag)"
        class="text-xs px-2 py-1 rounded-full transition-colors border"
        :class="[
          store.activeFilter.includeTags.includes(tag)
            ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200 hover:text-indigo-600'
        ]"
      >
        #{{ tag }}
      </button>
    </div>
  </div>
</template>

