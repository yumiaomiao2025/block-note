<script setup lang="ts">
import { useNoteStore } from '../stores/noteStore';
import NoteBlock from './NoteBlock.vue';
import { onMounted } from 'vue';
import { useI18n } from '../composables/useI18n';

const store = useNoteStore();
const { t } = useI18n();

onMounted(() => {
  // Auto-add a note if list is empty for better first-time experience
  if (store.notes.length === 0) {
    store.addNote();
  }
});
</script>

<template>
  <div class="max-w-3xl mx-auto pb-24 pt-8">
    <!-- Note List -->
    <TransitionGroup 
      name="list" 
      tag="div" 
      class="space-y-4"
    >
      <NoteBlock
        v-for="note in store.filteredNotes"
        :key="note.id"
        :note="note"
      />
    </TransitionGroup>

    <!-- Empty State for Filter -->
    <div v-if="store.filteredNotes.length === 0 && store.notes.length > 0" class="text-center py-12 text-gray-400">
      <p>{{ t('blockList.noNotesMatchFilter') }}</p>
      <button @click="store.clearFilter" class="text-indigo-500 hover:underline mt-2 text-sm">{{ t('blockList.clearFilter') }}</button>
    </div>
    
    <!-- Add New Block Button (Inline) -->
    <div class="mt-6 mb-12">
      <button
        @click="store.addNote"
        class="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all duration-200 flex items-center justify-center gap-2 group"
        :title="t('blockList.addNewBlock')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 group-hover:scale-110 transition-transform duration-200">
          <path fill-rule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clip-rule="evenodd" />
        </svg>
        <span class="font-semibold text-lg">{{ t('blockList.newNote') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
  z-index: -1;
}
</style>
