<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { Teleport } from 'vue';
import { useNoteStore } from '../stores/noteStore';

const props = defineProps<{
  mode: 'normal' | 'light';
  noteId: string;
  triggerElement?: HTMLElement | null;
}>();

const emit = defineEmits(['close']);

const store = useNoteStore();
const activeTab = ref<'tags' | 'templates'>('tags');

// 浮窗位置
const popoverStyle = ref({ top: '0px', left: '0px' });
const elRef = ref<HTMLElement | null>(null);

// --- Data Sources ---

// Normal Tags: Grouped
const groupedTags = computed(() => {
  if (props.mode === 'light') return {};
  
  const groups: Record<string, string[]> = {
    'Uncategorized': store.uncategorizedTags
  };
  
  store.tagGroups.forEach(g => {
    groups[g.name] = g.tags;
  });
  
  return groups;
});

// Light Tags: Flat list (Top used)
const lightTags = computed(() => {
    if (props.mode !== 'light') return [];
    
    // 从轻标签系统读取标签列表
    const systemTags = store.lightTagSystem || [];
    
    // 统计使用频率用于排序
    const counts = new Map<string, number>();
    store.notes.forEach(note => {
        if (note.lightTags) {
             note.lightTags.forEach(tag => {
                counts.set(tag, (counts.get(tag) || 0) + 1);
            });
        }
    });
    
    // 按使用频率排序，但只返回系统中存在的标签
    return systemTags
        .map(tag => [tag, counts.get(tag) || 0] as [string, number])
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);
});

// Templates
const templates = computed(() => store.templates);

// --- Actions ---

function addTag(tag: string) {
  if (props.mode === 'normal') {
    store.addTag(props.noteId, tag);
  } else {
    store.addLightTag(props.noteId, tag);
  }
  emit('close');
}

function applyTemplate(templateId: string) {
  const tpl = store.templates.find(t => t.id === templateId);
  if (tpl) {
    tpl.filterRules.includeTags.forEach(tag => {
      store.addTag(props.noteId, tag);
    });
  }
  emit('close');
}

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
      class="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-xl w-64 flex flex-col max-h-80 overflow-hidden text-sm font-sans"
      :style="popoverStyle"
    >
    
    <!-- Tabs (Only for Normal Mode) -->
    <div v-if="mode === 'normal'" class="flex border-b border-gray-100">
      <button 
        @click="activeTab = 'tags'" 
        class="flex-1 py-2 font-medium text-center transition-colors"
        :class="activeTab === 'tags' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'"
      >
        Tags
      </button>
      <button 
        @click="activeTab = 'templates'" 
        class="flex-1 py-2 font-medium text-center transition-colors"
        :class="activeTab === 'templates' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'"
      >
        Templates
      </button>
    </div>
    
    <!-- Header for Light Mode -->
    <div v-else class="p-2 border-b border-gray-100 bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wider">
        Quick Light Tags
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
        
        <!-- Mode: Normal Tags -->
        <div v-if="mode === 'normal' && activeTab === 'tags'" class="space-y-3">
            <div v-for="(tags, groupName) in groupedTags" :key="groupName">
                <div v-if="tags.length > 0">
                    <div class="text-xs text-gray-400 font-bold mb-1 uppercase">{{ groupName }}</div>
                    <div class="flex flex-wrap gap-1">
                        <button 
                          v-for="tag in tags" 
                          :key="tag"
                          @click="addTag(tag)"
                          class="px-2 py-1 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 rounded border border-gray-100 text-gray-600 transition-colors text-xs"
                        >
                          {{ tag }}
                        </button>
                    </div>
                </div>
            </div>
            <div v-if="Object.values(groupedTags).every(t => t.length === 0)" class="text-center text-gray-400 py-4 italic">
                No tags created yet.
            </div>
        </div>

        <!-- Mode: Templates -->
        <div v-if="mode === 'normal' && activeTab === 'templates'" class="space-y-1">
            <button 
              v-for="tpl in templates" 
              :key="tpl.id"
              @click="applyTemplate(tpl.id)"
              class="w-full text-left px-2 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded transition-colors truncate"
            >
              {{ tpl.name }}
              <span class="text-xs text-gray-400 ml-1">({{ tpl.filterRules.includeTags.length }} tags)</span>
            </button>
             <div v-if="templates.length === 0" class="text-center text-gray-400 py-4 italic">
                No templates.
            </div>
        </div>

        <!-- Mode: Light Tags -->
        <div v-if="mode === 'light'">
             <div class="flex flex-wrap gap-1">
                <button 
                  v-for="tag in lightTags" 
                  :key="tag"
                  @click="addTag(tag)"
                  class="px-2 py-1 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 rounded border border-gray-100 text-gray-600 transition-colors text-xs"
                >
                  {{ tag }}
                </button>
            </div>
            <div v-if="lightTags.length === 0" class="text-center text-gray-400 py-4 italic">
                No recent light tags.
            </div>
        </div>

    </div>
    </div>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 4px;
}
</style>



