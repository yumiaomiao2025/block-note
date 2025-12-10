<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useNoteStore } from '../stores/noteStore';

const props = defineProps<{
  isOpen: boolean;
  selectedTags: string[];
}>();

const emit = defineEmits<{
  close: [];
  confirm: [tags: string[]];
}>();

const store = useNoteStore();
const searchQuery = ref('');
const selectedTagSet = ref<Set<string>>(new Set(props.selectedTags));

// Update selectedTagSet when props change
watch(() => props.selectedTags, (newTags) => {
  selectedTagSet.value = new Set(newTags);
}, { immediate: true });

const filteredTagGroups = computed(() => {
  if (!searchQuery.value.trim()) {
    return store.tagGroups;
  }
  const query = searchQuery.value.toLowerCase();
  return store.tagGroups.map(group => ({
    ...group,
    tags: group.tags.filter(tag => tag.toLowerCase().includes(query))
  })).filter(group => group.tags.length > 0);
});

const filteredUncategorizedTags = computed(() => {
  if (!searchQuery.value.trim()) {
    return store.uncategorizedTags;
  }
  const query = searchQuery.value.toLowerCase();
  return store.uncategorizedTags.filter(tag => tag.toLowerCase().includes(query));
});

function toggleTag(tag: string) {
  if (selectedTagSet.value.has(tag)) {
    selectedTagSet.value.delete(tag);
  } else {
    selectedTagSet.value.add(tag);
  }
}

function handleConfirm() {
  emit('confirm', Array.from(selectedTagSet.value));
  emit('close');
}

function handleCancel() {
  selectedTagSet.value = new Set(props.selectedTags);
  emit('close');
}

function getTagUsageCount(tag: string): number {
  return store.getTagUsageCount(tag);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" @click="handleCancel"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col transform transition-all scale-100" @click.stop>
          <!-- Header -->
          <div class="p-6 border-b border-gray-200 flex-shrink-0">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Select Tags
            </h3>
            <!-- Search -->
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search tags..."
              class="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Tag Groups -->
            <div v-for="group in filteredTagGroups" :key="group.id" class="space-y-2">
              <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                {{ group.name }}
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="tag in group.tags"
                  :key="tag"
                  @click="toggleTag(tag)"
                  class="text-sm px-3 py-1.5 rounded-full border transition-all flex items-center gap-2"
                  :class="selectedTagSet.has(tag) 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 font-medium' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600'"
                >
                  <div class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                       :class="selectedTagSet.has(tag) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'">
                    <svg v-if="selectedTagSet.has(tag)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-white">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <span>{{ tag }}</span>
                  <span class="text-[10px] text-gray-400">({{ getTagUsageCount(tag) }})</span>
                </button>
              </div>
            </div>

            <!-- Uncategorized Tags -->
            <div v-if="filteredUncategorizedTags.length > 0" class="space-y-2">
              <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Uncategorized
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="tag in filteredUncategorizedTags"
                  :key="tag"
                  @click="toggleTag(tag)"
                  class="text-sm px-3 py-1.5 rounded-full border transition-all flex items-center gap-2"
                  :class="selectedTagSet.has(tag) 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 font-medium' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600'"
                >
                  <div class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                       :class="selectedTagSet.has(tag) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'">
                    <svg v-if="selectedTagSet.has(tag)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-white">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <span>{{ tag }}</span>
                  <span class="text-[10px] text-gray-400">({{ getTagUsageCount(tag) }})</span>
                </button>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="filteredTagGroups.length === 0 && filteredUncategorizedTags.length === 0" class="text-center text-gray-400 py-8">
              <p>No tags found matching "{{ searchQuery }}"</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-6 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
            <div class="text-sm text-gray-600">
              {{ selectedTagSet.size }} tag{{ selectedTagSet.size !== 1 ? 's' : '' }} selected
            </div>
            <div class="flex items-center gap-3">
              <button 
                @click="handleCancel"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button 
                @click="handleConfirm"
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
              >
                Add to Staging Area
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

