import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { ref } from 'vue';
import type { UIThemeConfig } from '../types/models';

export const useUIStore = defineStore('ui', () => {
  const isEditing = ref(false);

  const defaultConfig: UIThemeConfig = {
    layout: {
      listStartX: 50, // Percentage
      listStartY: 0,
      blockWidth: 600,
      filterPosition: { x: 50, y: 0 }
    },
    style: {
      appBackgroundColor: '#f3f4f6', // bg-gray-100
      blockBackgroundColor: '#ffffff',
      blockFontColor: '#374151', // text-gray-700
      blockBorderRadius: 8,
      blockBlur: 0,
      tagColor: '#4f46e5', // indigo-600
    },
    decorations: []
  };

  // Current global theme (or derived from template)
  const currentConfig = useStorage<UIThemeConfig>('blocknote-ui-config', defaultConfig);

  function updateConfig(updates: Partial<UIThemeConfig>) {
    // Deep merge for nested objects to avoid overwriting
    if (updates.layout) Object.assign(currentConfig.value.layout!, updates.layout);
    if (updates.style) Object.assign(currentConfig.value.style!, updates.style);
    if (updates.decorations) currentConfig.value.decorations = updates.decorations;
  }

  function toggleEditMode() {
    isEditing.value = !isEditing.value;
  }

  return {
    isEditing,
    currentConfig,
    defaultConfig,
    updateConfig,
    toggleEditMode
  };
});

