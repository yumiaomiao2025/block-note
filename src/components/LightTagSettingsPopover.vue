<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Teleport } from 'vue';
import { useUIStore } from '../stores/uiStore';

const props = defineProps<{
  triggerElement?: HTMLElement | null;
}>();

const emit = defineEmits(['close']);

const uiStore = useUIStore();
const displayLimit = ref(uiStore.lightTagDisplayLimit);

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
  const value = Math.max(1, Math.floor(Number(displayLimit.value)));
  uiStore.lightTagDisplayLimit = value;
  displayLimit.value = value;
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
        <h3 class="font-semibold text-gray-800 text-sm">轻标签显示设置</h3>
      </div>
      
      <!-- Content -->
      <div class="p-4 space-y-3">
        <div>
          <label class="block text-xs text-gray-600 mb-2">
            "+N" 大于几个时显示
          </label>
          <input 
            v-model.number="displayLimit"
            type="number"
            min="1"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="5"
          />
        </div>
        
        <p class="text-xs text-gray-500">
          如果设置很大，轻标签将全部显示，不会出现 "+N"。
        </p>
      </div>
      
      <!-- Footer -->
      <div class="p-3 border-t border-gray-100 flex justify-end gap-2">
        <button 
          @click="emit('close')"
          class="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          取消
        </button>
        <button 
          @click="handleSave"
          class="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  </Teleport>
</template>


