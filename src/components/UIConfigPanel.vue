<script setup lang="ts">
import { useUIStore } from '../stores/uiStore';

const uiStore = useUIStore();
</script>

<template>
  <div class="fixed right-4 top-20 w-64 bg-white/90 backdrop-blur shadow-xl rounded-lg border border-gray-200 p-4 z-50 transition-all"
    v-if="uiStore.isEditing"
  >
    <h3 class="font-bold text-gray-800 mb-4 border-b pb-2">UI Editor</h3>
    
    <div class="space-y-4 text-sm">
      <!-- Background Color -->
      <div>
        <label class="block text-gray-600 mb-1">App Background</label>
        <div class="flex gap-2">
          <input type="color" v-model="uiStore.currentConfig.style.appBackgroundColor" class="h-8 w-8 rounded cursor-pointer border border-gray-300" />
          <input type="text" v-model="uiStore.currentConfig.style.appBackgroundColor" class="flex-1 border rounded px-2 text-gray-600" />
        </div>
      </div>

      <!-- Block Width -->
      <div>
        <label class="block text-gray-600 mb-1">Block Width (px)</label>
        <input 
          type="range" 
          min="300" 
          max="1200" 
          v-model.number="uiStore.currentConfig.layout.blockWidth" 
          class="w-full"
        />
        <div class="text-xs text-gray-400 text-right">{{ uiStore.currentConfig.layout.blockWidth }}px</div>
      </div>

      <!-- Border Radius -->
      <div>
        <label class="block text-gray-600 mb-1">Block Radius (px)</label>
        <input 
          type="range" 
          min="0" 
          max="30" 
          v-model.number="uiStore.currentConfig.style.blockBorderRadius" 
          class="w-full"
        />
        <div class="text-xs text-gray-400 text-right">{{ uiStore.currentConfig.style.blockBorderRadius }}px</div>
      </div>

       <!-- Tag Color -->
       <div>
        <label class="block text-gray-600 mb-1">Tag Color</label>
        <div class="flex gap-2">
          <input type="color" v-model="uiStore.currentConfig.style.tagColor" class="h-8 w-8 rounded cursor-pointer border border-gray-300" />
          <input type="text" v-model="uiStore.currentConfig.style.tagColor" class="flex-1 border rounded px-2 text-gray-600" />
        </div>
      </div>
    </div>
  </div>
</template>

