<script setup lang="ts">
import { useUIStore } from '../stores/uiStore';
import { v4 as uuidv4 } from 'uuid';
import { ref } from 'vue';
import { useDraggable } from '@vueuse/core';

const uiStore = useUIStore();
const decorationRefs = ref<HTMLElement[]>([]);

function startDrag(event: MouseEvent, id: string) {
  if (!uiStore.isEditing) return;
  
  // Basic implementation: In a real app, use proper DnD library or useDraggable per item
  // For simplicity in MVP, we assume simple absolute positioning updates via native DnD or mouse events.
  // However, let's implement a simple "Click to edit/drag" logic here or just rely on inputs for now.
  // Better: Use inputs in the config panel to adjust X/Y for now to ensure stability, 
  // or implement simple mouse move logic.
}

// Using simple style binding for positioning
</script>

<template>
  <div class="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    <!-- Render Decorations -->
    <div
      v-for="item in uiStore.currentConfig.decorations"
      :key="item.id"
      class="absolute transition-all duration-300"
      :class="{ 'pointer-events-auto cursor-move ring-2 ring-indigo-400 ring-offset-2': uiStore.isEditing }"
      :style="{
        left: `${item.x}px`,
        top: `${item.y}px`,
        transform: `scale(${item.scale})`,
        zIndex: item.zIndex
      }"
      @mousedown="startDrag($event, item.id)"
    >
      <!-- Image Type -->
      <img 
        v-if="item.type === 'image'" 
        :src="item.content" 
        alt="decoration" 
        class="max-w-[300px] object-contain select-none opacity-80"
      />
      
      <!-- Text Type -->
      <div 
        v-else-if="item.type === 'text'"
        class="text-6xl font-black text-gray-200/50 whitespace-nowrap select-none"
      >
        {{ item.content }}
      </div>
    </div>
  </div>
</template>

