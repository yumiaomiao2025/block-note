<script setup lang="ts">
import { useNoteStore } from '../stores/noteStore';
import NoteBlock from './NoteBlock.vue';
import { onMounted } from 'vue';

const store = useNoteStore();

onMounted(() => {
  // Auto-add a note if list is empty for better first-time experience
  if (store.notes.length === 0) {
    store.addNote();
  }
});
</script>

<template>
  <div class="max-w-3xl mx-auto pb-24 pt-8">
    <TransitionGroup 
      name="list" 
      tag="div" 
      class="space-y-4"
    >
      <NoteBlock
        v-for="note in store.notes"
        :key="note.id"
        :note="note"
      />
    </TransitionGroup>

    <!-- Empty state placeholder if needed, though we auto-add -->
    
    <!-- Floating Action Button -->
    <div class="fixed bottom-8 right-8 z-50">
      <button
        @click="store.addNote"
        class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-300"
        title="Add new block"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
          <path fill-rule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clip-rule="evenodd" />
        </svg>
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

