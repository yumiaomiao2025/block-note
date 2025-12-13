<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Teleport } from 'vue';
import type { FilterTemplate, TagGroup } from '../types/models';

const props = withDefaults(defineProps<{
  type: 'template' | 'tagGroup';
  data: FilterTemplate | TagGroup;
  triggerElement?: HTMLElement | null;
  delay?: number;
  position?: 'follow' | 'fixed';
}>(), {
  delay: 0,
  position: 'follow'
});

const show = ref(false);
const mousePosition = ref({ x: 0, y: 0 });
const popoverStyle = ref({ top: '0px', left: '0px' });
const elRef = ref<HTMLElement | null>(null);
let delayTimer: ReturnType<typeof setTimeout> | null = null;

// 根据类型获取标签列表
const tags = computed(() => {
  if (props.type === 'template') {
    return (props.data as FilterTemplate).filterRules.includeTags;
  } else {
    return (props.data as TagGroup).tags;
  }
});

// 标题文本
const title = computed(() => {
  return props.type === 'template' ? '模板标签' : '标签组标签';
});

// 处理鼠标移动（跟随模式）
function handleMouseMove(event: MouseEvent) {
  if (props.position === 'follow') {
    mousePosition.value = { x: event.clientX, y: event.clientY };
    updatePosition();
  }
}

// 更新位置
function updatePosition() {
  if (!elRef.value) return;

  if (props.position === 'follow') {
    // 跟随鼠标模式：在鼠标位置附近显示，添加偏移避免遮挡
    const offsetX = 15;
    const offsetY = 15;
    const popoverRect = elRef.value.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = mousePosition.value.x + offsetX;
    let top = mousePosition.value.y + offsetY;

    // 边界检查：如果超出右边界，显示在鼠标左侧
    if (left + popoverRect.width > windowWidth) {
      left = mousePosition.value.x - popoverRect.width - offsetX;
    }

    // 边界检查：如果超出下边界，显示在鼠标上方
    if (top + popoverRect.height > windowHeight) {
      top = mousePosition.value.y - popoverRect.height - offsetY;
    }

    // 确保不超出左边界和上边界
    left = Math.max(8, left);
    top = Math.max(8, top);

    popoverStyle.value = {
      top: `${top}px`,
      left: `${left}px`
    };
  } else if (props.position === 'fixed' && props.triggerElement) {
    // 固定位置模式：基于触发器元素计算位置
    const rect = props.triggerElement.getBoundingClientRect();
    const popoverRect = elRef.value.getBoundingClientRect();
    
    // 计算位置：显示在元素右侧
    const left = rect.right + 8;
    const top = rect.top;
    
    // 边界检查
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let finalLeft = left;
    let finalTop = top;
    
    // 如果超出右边界，显示在左侧
    if (left + popoverRect.width > windowWidth) {
      finalLeft = rect.left - popoverRect.width - 8;
    }
    
    // 如果超出下边界，向上调整
    if (top + popoverRect.height > windowHeight) {
      finalTop = windowHeight - popoverRect.height - 8;
    }
    
    // 确保不超出边界
    finalLeft = Math.max(8, finalLeft);
    finalTop = Math.max(8, finalTop);
    
    popoverStyle.value = {
      top: `${finalTop}px`,
      left: `${finalLeft}px`
    };
  }
}

// 显示悬浮窗
function showPopover() {
  if (props.delay > 0) {
    delayTimer = setTimeout(() => {
      show.value = true;
      nextTick(() => {
        updatePosition();
      });
    }, props.delay);
  } else {
    show.value = true;
    nextTick(() => {
      updatePosition();
    });
  }
}

// 隐藏悬浮窗
function hidePopover() {
  if (delayTimer) {
    clearTimeout(delayTimer);
    delayTimer = null;
  }
  show.value = false;
}

// 监听触发器元素变化（固定位置模式）
watch(() => props.triggerElement, () => {
  if (props.position === 'fixed' && props.triggerElement) {
    updatePosition();
  }
}, { immediate: true });

// 监听数据变化，更新位置
watch(() => props.data, () => {
  if (show.value) {
    nextTick(() => {
      updatePosition();
    });
  }
});

onMounted(() => {
  if (props.position === 'follow') {
    window.addEventListener('mousemove', handleMouseMove);
  }
  
  // 监听滚动和窗口大小变化
  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);
  
  showPopover();
});

onUnmounted(() => {
  if (delayTimer) {
    clearTimeout(delayTimer);
  }
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('scroll', updatePosition, true);
  window.removeEventListener('resize', updatePosition);
});

// 暴露方法供父组件调用
defineExpose({
  show: showPopover,
  hide: hidePopover
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="elRef"
      class="fixed z-[9999] bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl backdrop-blur pointer-events-none transition-opacity duration-200 max-w-xs"
      :style="popoverStyle"
    >
      <div class="font-bold mb-2 border-b border-white/10 pb-1 text-gray-300">{{ title }}</div>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="tag in tags"
          :key="tag"
          class="bg-white/10 px-1.5 py-0.5 rounded text-[10px]"
        >
          {{ tag }}
        </span>
        <span v-if="tags.length === 0" class="italic opacity-50 text-[10px]">无标签</span>
      </div>
    </div>
  </Teleport>
</template>
