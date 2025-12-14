<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Teleport } from 'vue';
import { useNoteStore } from '../stores/noteStore';
import { useI18n } from '../composables/useI18n';

const props = defineProps<{
  triggerElement?: HTMLElement | null;
}>();

const emit = defineEmits(['close']);

const store = useNoteStore();
const { t } = useI18n();

// 浮窗位置
const popoverStyle = ref({ top: '0px', left: '0px' });
const elRef = ref<HTMLElement | null>(null);

// 计算浮窗位置
function updatePosition() {
  if (props.triggerElement && elRef.value) {
    const rect = props.triggerElement.getBoundingClientRect();
    const popoverRect = elRef.value.getBoundingClientRect();
    
    // 计算位置：按钮右上角对齐到浮窗右上角，向上偏移一点
    const top = rect.top - popoverRect.height - 4; // 4px 间距
    const left = rect.right - popoverRect.width; // 右对齐
    
    // 边界检查：如果浮窗超出视口左侧，则对齐到按钮左侧
    const finalLeft = left < 8 ? rect.left : left;
    
    popoverStyle.value = {
      top: `${Math.max(8, top)}px`, // 至少距离顶部 8px
      left: `${finalLeft}px`
    };
  }
}

// 监听触发器元素变化
watch(() => props.triggerElement, () => {
  if (props.triggerElement) {
    updatePosition();
  }
}, { immediate: true });

// --- Click Outside ---
function handleClickOutside(event: MouseEvent) {
  if (elRef.value && !elRef.value.contains(event.target as Node)) {
    // 也要排除触发器元素
    if (props.triggerElement && !props.triggerElement.contains(event.target as Node)) {
      emit('close');
    }
  }
}

function handleSave() {
  // 排序设置已经通过 v-model 直接绑定到 store，无需额外保存
  emit('close');
}

onMounted(() => {
  updatePosition();
  // 使用 requestAnimationFrame 确保 DOM 已更新
  requestAnimationFrame(() => {
    updatePosition();
  });
  
  // 监听滚动和窗口大小变化
  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);
  
  setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
  }, 100);
});

onUnmounted(() => {
  window.removeEventListener('scroll', updatePosition, true);
  window.removeEventListener('resize', updatePosition);
  document.removeEventListener('click', handleClickOutside);
});

</script>

<template>
  <Teleport to="body">
    <div 
      ref="elRef" 
      class="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-xl w-64 flex flex-col text-sm font-sans"
      :style="popoverStyle"
    >
      <!-- Header -->
      <div class="p-3 border-b border-gray-100 bg-gray-50">
        <h3 class="font-semibold text-gray-800 text-sm">{{ t('templateManager.sortSettings') }}</h3>
      </div>
      
      <!-- Content -->
      <div class="p-4 space-y-4">
        <div>
          <label class="block text-xs text-gray-600 mb-2">
            {{ t('templateManager.templateGroupSort') }}
          </label>
          <select 
            v-model="store.templateGroupSortOrder"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="manual">{{ t('templateManager.sortManual') }}</option>
            <option value="name">{{ t('templateManager.sortName') }}</option>
            <option value="usage">{{ t('templateManager.sortUsage') }}</option>
            <option value="time">{{ t('templateManager.sortTime') }}</option>
          </select>
        </div>
        
        <div>
          <label class="block text-xs text-gray-600 mb-2">
            {{ t('templateManager.templateInGroupSort') }}
          </label>
          <select 
            v-model="store.templateInGroupSortOrder"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="manual">{{ t('templateManager.sortManual') }}</option>
            <option value="name">{{ t('templateManager.sortName') }}</option>
            <option value="usage">{{ t('templateManager.sortUsage') }}</option>
            <option value="time">{{ t('templateManager.sortTime') }}</option>
          </select>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-3 border-t border-gray-100 flex justify-end gap-2">
        <button 
          @click="emit('close')"
          class="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          {{ t('btn.close') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
