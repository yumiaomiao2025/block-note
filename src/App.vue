<script setup lang="ts">
import BlockList from './components/BlockList.vue';
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <div class="sticky top-0 z-40 bg-gray-100/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 mb-4">
      <h1 class="text-xl font-bold text-gray-800 flex items-center gap-2">
        <span class="w-6 h-6 bg-indigo-600 rounded text-white flex items-center justify-center text-xs">B</span>
        BlockNote
      </h1>
    </div>
    
    <div class="px-4">
      <BlockList />
    </div>
  </div>
</template>
