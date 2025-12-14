<script setup lang="ts">
import { ref, computed, nextTick, Teleport } from 'vue';
import { useNoteStore } from '../stores/noteStore';
import { useUIStore } from '../stores/uiStore';
import HoverPreviewPopover from '../components/HoverPreviewPopover.vue';
import TemplateSettingsPopover from '../components/TemplateSettingsPopover.vue';
import { v4 as uuidv4 } from 'uuid';
import type { FilterTemplate, TemplateGroup } from '../types/models';
import { useI18n } from '../composables/useI18n';

const store = useNoteStore();
const uiStore = useUIStore();
const { t } = useI18n();

const selectedTemplateId = ref<string | null>(null);
const newTemplateName = ref('');
const newTemplateGroupName = ref('');
const searchQuery = ref('');
const showStats = ref(false);
const showSettings = ref(false);
const settingsBtnRef = ref<HTMLElement | null>(null);

// 展开/折叠状态
const collapsedGroups = ref<Set<string>>(new Set());

// 模板组管理相关
const editingGroupId = ref<string | null>(null);
const editingGroupNameValue = ref('');

// 模板重命名相关
const editingTemplateId = ref<string | null>(null);
const editingTemplateName = ref('');
const showRenameTemplateDialog = ref(false);

// Hover Preview Logic (for Quick Preview Mode)
const hoveredTemplate = ref<FilterTemplate | null>(null);

// --- Computed ---
const selectedTemplate = computed(() => store.templates.find(t => t.id === selectedTemplateId.value));

// 获取通用组 ID
const generalGroupId = computed(() => store.getGeneralGroupId());

// 获取当前模板的组 ID（如果没有则使用通用组）
const currentTemplateGroupId = computed(() => {
    if (!selectedTemplate.value) return generalGroupId.value;
    return selectedTemplate.value.groupId || generalGroupId.value;
});

// 获取模板组名称
function getGroupName(groupId: string | undefined): string {
    if (!groupId) return t('common.general');
    const group = store.getTemplateGroup(groupId);
    return group ? group.name : t('common.general');
}

// 获取所有模板组（包括通用组）
const allTemplateGroups = computed(() => {
    const groups: TemplateGroup[] = [];
    // 添加通用组
    const generalGroup = store.getTemplateGroup(generalGroupId.value);
    if (generalGroup) {
        groups.push(generalGroup);
    }
    // 添加其他组
    store.templateGroups.forEach(group => {
        if (group.id !== generalGroupId.value) {
            groups.push(group);
        }
    });
    return groups;
});

// 过滤和排序模板
const filteredTemplates = computed(() => {
    let result = store.templates;
    
    // 应用搜索过滤（同时搜索模板名称和模板组名称）
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        const matchingGroupIds = new Set<string>();
        
        // 查找匹配的模板组
        allTemplateGroups.value.forEach(group => {
            if (group.name.toLowerCase().includes(query)) {
                matchingGroupIds.add(group.id);
            }
        });
        
        result = result.filter(t => {
            // 模板名称匹配
            if (t.name.toLowerCase().includes(query)) {
                return true;
            }
            // 模板组名称匹配
            if (t.groupId && matchingGroupIds.has(t.groupId)) {
                return true;
            }
            // 向后兼容：检查旧的 group 字段
            if (t.group && t.group.toLowerCase().includes(query)) {
                return true;
            }
            return false;
        });
    }
    
    return result;
});

// 按组分组模板
const groupedFilteredTemplates = computed(() => {
    const groups: Record<string, FilterTemplate[]> = {};
    
    // 初始化所有组
    allTemplateGroups.value.forEach(group => {
        groups[group.id] = [];
    });
    
    // 分配模板到组
    filteredTemplates.value.forEach(t => {
        const groupId = t.groupId || generalGroupId.value;
        if (!groups[groupId]) {
            groups[groupId] = [];
        }
        groups[groupId].push(t);
    });
    
    // 对每个组内的模板进行排序
    Object.keys(groups).forEach(groupId => {
        const templates = groups[groupId];
        const sortOrder = store.templateInGroupSortOrder;
        
        if (sortOrder === 'name') {
            templates.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOrder === 'usage') {
            templates.sort((a, b) => {
                const countA = store.getTemplateMatchCount(a.id);
                const countB = store.getTemplateMatchCount(b.id);
                return countB - countA;
            });
        } else if (sortOrder === 'time') {
            // 使用数组索引作为代理（因为模板没有 createdAt）
            templates.reverse();
        }
        // 'manual' 保持原始顺序
    });
    
    return groups;
});

// 排序后的模板组列表
const sortedTemplateGroups = computed(() => {
    let groups = [...allTemplateGroups.value];
    const sortOrder = store.templateGroupSortOrder;
    
    if (sortOrder === 'name') {
        groups.sort((a, b) => {
            // 通用组始终在最前面
            if (a.id === generalGroupId.value) return -1;
            if (b.id === generalGroupId.value) return 1;
            return a.name.localeCompare(b.name);
        });
    } else if (sortOrder === 'usage') {
        groups.sort((a, b) => {
            // 通用组始终在最前面
            if (a.id === generalGroupId.value) return -1;
            if (b.id === generalGroupId.value) return 1;
            const countA = store.getTemplateGroupUsageCount(a.id);
            const countB = store.getTemplateGroupUsageCount(b.id);
            return countB - countA;
        });
    } else if (sortOrder === 'time') {
        groups.sort((a, b) => {
            // 通用组始终在最前面
            if (a.id === generalGroupId.value) return -1;
            if (b.id === generalGroupId.value) return 1;
            const timeA = a.createdAt || 0;
            const timeB = b.createdAt || 0;
            return timeB - timeA;
        });
    } else {
        // 'manual' 保持原始顺序，但通用组在最前面
        groups.sort((a, b) => {
            if (a.id === generalGroupId.value) return -1;
            if (b.id === generalGroupId.value) return 1;
            return 0;
        });
    }
    
    return groups;
});

// --- Actions ---
function createTemplate() {
    if (newTemplateName.value.trim()) {
        store.createTemplate(newTemplateName.value.trim());
        newTemplateName.value = '';
        if (store.selectedTemplateIds.length > 0) {
             selectedTemplateId.value = store.selectedTemplateIds[0];
        }
    }
}

function createTemplateGroup() {
    if (newTemplateGroupName.value.trim()) {
        store.createTemplateGroup(newTemplateGroupName.value.trim());
        newTemplateGroupName.value = '';
    }
}

function deleteTemplateGroup(id: string) {
    const group = store.getTemplateGroup(id);
    if (!group) return;
    
    const templatesInGroup = store.templates.filter(t => t.groupId === id);
    
    const message = templatesInGroup.length > 0
        ? t('templateManager.deleteTemplateGroupConfirm', { name: group.name }) + '\n\n' + 
          t('templateManager.deleteTemplateGroupWithTemplates', { count: templatesInGroup.length })
        : t('templateManager.deleteTemplateGroupConfirm', { name: group.name }) + '\n\n' + 
          t('templateManager.deleteTemplateGroupNoTemplates');
    
    if (confirm(message)) {
        store.deleteTemplateGroup(id);
    }
}

function toggleGroupCollapse(groupId: string) {
    if (collapsedGroups.value.has(groupId)) {
        collapsedGroups.value.delete(groupId);
    } else {
        collapsedGroups.value.add(groupId);
    }
}

function isGroupCollapsed(groupId: string): boolean {
    return collapsedGroups.value.has(groupId);
}

function deleteTemplate(id: string) {
    if (confirm(t('templateManager.deleteTemplate'))) {
        store.deleteTemplate(id);
        if (selectedTemplateId.value === id) {
            selectedTemplateId.value = null;
        }
    }
}

// --- Tag Management ---
function isTagSelected(tag: string): boolean {
    return selectedTemplate.value?.filterRules.includeTags.includes(tag) || false;
}

function toggleTag(tag: string) {
    if (!selectedTemplate.value) return;
    
    const currentTags = [...selectedTemplate.value.filterRules.includeTags];
    if (currentTags.includes(tag)) {
        store.updateTemplate(selectedTemplate.value.id, {
            filterRules: { ...selectedTemplate.value.filterRules, includeTags: currentTags.filter(t => t !== tag) }
        });
    } else {
        store.updateTemplate(selectedTemplate.value.id, {
            filterRules: { ...selectedTemplate.value.filterRules, includeTags: [...currentTags, tag] }
        });
    }
}

function duplicateTemplate(id: string) {
    const template = store.templates.find(t => t.id === id);
    if (!template) return;
    
    const newTemplate: typeof template = {
        ...template,
        id: uuidv4(),
        name: `${template.name} Copy`
    };
    store.templates.push(newTemplate);
    selectedTemplateId.value = newTemplate.id;
}

// 模板组重命名
function startRenameGroup(groupId: string) {
    const group = store.getTemplateGroup(groupId);
    if (!group) return;
    
    // 不允许重命名通用组
    if (groupId === generalGroupId.value) return;
    
    editingGroupId.value = groupId;
    editingGroupNameValue.value = group.name;
    nextTick(() => {
        const input = document.getElementById(`rename-group-input-${groupId}`) as HTMLInputElement;
        if (input) {
            input.focus();
            input.select();
        }
    });
}

function confirmRenameGroup() {
    if (!editingGroupId.value || !editingGroupNameValue.value.trim()) {
        cancelRenameGroup();
        return;
    }
    
    const newName = editingGroupNameValue.value.trim();
    store.updateTemplateGroup(editingGroupId.value, { name: newName });
    
    cancelRenameGroup();
}

function cancelRenameGroup() {
    editingGroupId.value = null;
    editingGroupNameValue.value = '';
}

// 模板重命名
function startRenameTemplate(id: string) {
    const template = store.templates.find(t => t.id === id);
    if (template) {
        editingTemplateId.value = id;
        editingTemplateName.value = template.name;
        showRenameTemplateDialog.value = true;
    }
}

function confirmRenameTemplate() {
    if (!editingTemplateId.value || !editingTemplateName.value.trim()) {
        cancelRenameTemplate();
        return;
    }
    
    const template = store.templates.find(t => t.id === editingTemplateId.value);
    if (template && template.name !== editingTemplateName.value.trim()) {
        store.updateTemplate(editingTemplateId.value, { name: editingTemplateName.value.trim() });
    }
    
    cancelRenameTemplate();
}

function cancelRenameTemplate() {
    showRenameTemplateDialog.value = false;
    editingTemplateId.value = null;
    editingTemplateName.value = '';
}

// 移动模板到组
function moveTemplateToGroup(templateId: string, groupId: string) {
    store.updateTemplate(templateId, { 
        groupId,
        // 清除旧的 group 字段（向后兼容）
        group: undefined
    });
}

</script>

<template>
  <div class="flex h-full bg-white">
      <!-- Left Sidebar: Template List -->
      <div class="w-64 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
          <div class="p-4 border-b border-gray-200 bg-white">
              <div class="flex items-center justify-between mb-2">
                  <h2 class="font-bold text-lg text-gray-800">{{ t('templateManager.templates') }}</h2>
                  <div class="flex items-center gap-1">
                      <button
                          ref="settingsBtnRef"
                          @click="showSettings = !showSettings"
                          class="w-6 h-6 rounded border text-[10px] flex items-center justify-center transition-colors"
                          :class="showSettings ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-gray-200'"
                          :title="t('templateManager.sortSettings')"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                            <path fill-rule="evenodd" d="M8.5 2a1 1 0 000 2h.5a1 1 0 100-2h-.5zM5.22 3.22a.75.75 0 000 1.06l.5.5a.75.75 0 001.06-1.06l-.5-.5a.75.75 0 00-1.06 0zM13 2a1 1 0 100 2h.5a1 1 0 100-2H13zM3.28 6.22a.75.75 0 00-1.06 1.06l.5.5a.75.75 0 101.06-1.06l-.5-.5zM17 8a1 1 0 01-1 1h-.5a1 1 0 110-2H16a1 1 0 011 1zM9 10.5a1 1 0 01.5.866v4.134a.75.75 0 001.5 0v-4.134A1 1 0 0111 10.5a1 1 0 01-2 0zM4.5 13a1 1 0 100-2h-.5a1 1 0 100 2h.5zM17.72 13.78a.75.75 0 10-1.06-1.06l-.5.5a.75.75 0 101.06 1.06l.5-.5zM10 18a1 1 0 100-2h.5a1 1 0 100 2H10zM3.22 16.78a.75.75 0 001.06-1.06l-.5-.5a.75.75 0 10-1.06 1.06l.5.5zM14.5 18a1 1 0 100-2h.5a1 1 0 100 2h-.5z" clip-rule="evenodd" />
                          </svg>
                      </button>
                      <button
                          @click="showStats = !showStats"
                          class="w-6 h-6 rounded border text-[10px] flex items-center justify-center transition-colors"
                          :class="showStats ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-400 border-gray-300'"
                          :title="t('templateManager.showHideStatistics')"
                      >
                          #
                      </button>
                  </div>
              </div>
              <div class="mt-2 flex gap-2">
                  <input 
                    v-model="newTemplateName" 
                    :placeholder="t('placeholder.newTemplateName')"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    @keydown.enter="createTemplate"
                  />
                  <button @click="createTemplate" class="bg-indigo-600 text-white px-2.5 py-1 rounded text-sm hover:bg-indigo-700">+</button>
              </div>
              <!-- Create Template Group -->
              <div class="mt-2 flex gap-2">
                  <input 
                    v-model="newTemplateGroupName" 
                    :placeholder="t('placeholder.newTemplateGroupName')"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    @keydown.enter="createTemplateGroup"
                  />
                  <button @click="createTemplateGroup" class="bg-indigo-600 text-white px-2.5 py-1 rounded text-sm hover:bg-indigo-700">+组</button>
              </div>
              <!-- Search -->
              <div class="mt-2">
                  <input 
                    v-model="searchQuery" 
                    :placeholder="t('placeholder.searchTemplatesAndGroups')"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                  />
              </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2 space-y-4">
              <div v-for="group in sortedTemplateGroups" :key="group.id">
                  <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center justify-between group">
                      <div class="flex items-center gap-2 min-w-0 flex-1">
                          <button
                              @click.stop="toggleGroupCollapse(group.id)"
                              class="text-gray-400 hover:text-indigo-500 transition-colors p-0.5"
                          >
                              <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 20 20" 
                                  fill="currentColor" 
                                  class="w-3 h-3 transition-transform"
                                  :class="isGroupCollapsed(group.id) ? '' : 'rotate-90'"
                              >
                                  <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                              </svg>
                          </button>
                          <span v-if="editingGroupId !== group.id" class="truncate">{{ group.name }}</span>
                          <input
                            v-else
                            :id="`rename-group-input-${group.id}`"
                            v-model="editingGroupNameValue"
                            @keydown.enter="confirmRenameGroup"
                            @keydown.esc="cancelRenameGroup"
                            @blur="confirmRenameGroup"
                            class="text-xs border border-indigo-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                            @click.stop
                          />
                      </div>
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            v-if="editingGroupId !== group.id && group.id !== generalGroupId"
                            @click.stop="startRenameGroup(group.id)" 
                            class="text-gray-400 hover:text-indigo-500 transition-opacity p-1"
                            :title="t('btn.edit')"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                              </svg>
                          </button>
                          <button 
                            v-if="group.id !== generalGroupId"
                            @click.stop="deleteTemplateGroup(group.id)" 
                            class="text-gray-400 hover:text-red-500 transition-opacity p-1"
                            :title="t('templateManager.deleteTemplateGroup')"
                          >
                              &times;
                          </button>
                      </div>
                  </div>
                  <div v-if="!isGroupCollapsed(group.id)" class="space-y-1">
                      <div 
                        v-for="tpl in groupedFilteredTemplates[group.id] || []" 
                        :key="tpl.id"
                        @click="selectedTemplateId = tpl.id"
                        @mouseenter="uiStore.quickPreviewMode && (hoveredTemplate = tpl)"
                        @mouseleave="uiStore.quickPreviewMode && (hoveredTemplate = null)"
                        class="px-3 py-2 rounded cursor-pointer flex justify-between items-center group transition-colors"
                        :class="selectedTemplateId === tpl.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-700'"
                      >
                          <div class="flex items-center gap-2 flex-1 min-w-0">
                              <span class="truncate">{{ tpl.name }}</span>
                              <span v-if="showStats" class="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                                  ({{ store.getTemplateMatchCount(tpl.id) }})
                              </span>
                          </div>
                          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button @click.stop="startRenameTemplate(tpl.id)" class="text-gray-400 hover:text-indigo-600 p-1" :title="t('btn.edit')">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                  </svg>
                              </button>
                              <button @click.stop="duplicateTemplate(tpl.id)" class="text-gray-400 hover:text-indigo-600 p-1" :title="t('templateManager.duplicate')">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                                      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                                      <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                                  </svg>
                              </button>
                              <button @click.stop="deleteTemplate(tpl.id)" class="text-gray-400 hover:text-red-500 p-1">
                                  &times;
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <!-- Right Main: Template Editor -->
      <div class="flex-1 flex flex-col h-full overflow-hidden bg-gray-50/30">
          <div v-if="selectedTemplate" class="h-full flex flex-col">
              
              <!-- Editor Header -->
              <div class="p-6 border-b border-gray-200 bg-white shadow-sm z-10">
                  <div class="flex justify-between items-start mb-4">
                      <div>
                          <h1 class="text-2xl font-bold text-gray-900">{{ selectedTemplate.name }}</h1>
                          <div class="flex items-center gap-2 mt-2">
                              <span class="text-sm text-gray-500">{{ t('templateManager.changeGroup') }}:</span>
                              <select 
                                  :value="currentTemplateGroupId"
                                  @change="moveTemplateToGroup(selectedTemplate.id, ($event.target as HTMLSelectElement).value)"
                                  class="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors cursor-pointer"
                                  :title="t('templateManager.moveTemplateToGroup')"
                              >
                                  <option 
                                      v-for="group in sortedTemplateGroups" 
                                      :key="group.id"
                                      :value="group.id"
                                  >
                                      {{ group.name }}
                                  </option>
                              </select>
                          </div>
                          <!-- Statistics -->
                          <div v-if="showStats" class="mt-2 text-xs text-gray-500">
                              {{ t('templateManager.matches') }}: <span class="font-medium text-gray-700">{{ store.getTemplateMatchCount(selectedTemplate.id) }}</span> {{ t('status.notes') }}
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Tag Selection Area (Transfer Style) -->
              <div class="flex-1 flex overflow-hidden p-6 gap-6">
                  
                  <!-- Left: Available Tags -->
                  <div class="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div class="p-3 border-b border-gray-200 bg-gray-50 font-medium text-gray-700 flex justify-between items-center">
                          <span>{{ t('templateManager.availableTags') }}</span>
                          <span class="text-xs text-gray-500">{{ t('templateManager.clickToAdd') }}</span>
                      </div>
                      <div class="flex-1 overflow-y-auto p-4 space-y-6">
                          
                          <!-- Uncategorized -->
                          <div v-if="store.uncategorizedTags.length > 0">
                              <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Uncategorized</div>
                              <div class="flex flex-wrap gap-2">
                                  <button 
                                    v-for="tag in store.uncategorizedTags" 
                                    :key="tag"
                                    @click="!isTagSelected(tag) && toggleTag(tag)"
                                    class="text-sm px-3 py-1 rounded-full border transition-all text-left"
                                    :class="isTagSelected(tag) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600'"
                                  >
                                      {{ tag }}
                                  </button>
                              </div>
                          </div>

                          <!-- Groups -->
                          <div v-for="group in store.tagGroups" :key="group.id">
                              <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{{ group.name }}</div>
                              <div class="flex flex-wrap gap-2">
                                  <button 
                                    v-for="tag in group.tags" 
                                    :key="tag"
                                    @click="!isTagSelected(tag) && toggleTag(tag)"
                                    class="text-sm px-3 py-1 rounded-full border transition-all text-left"
                                    :class="isTagSelected(tag) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600'"
                                  >
                                      {{ tag }}
                                  </button>
                              </div>
                          </div>

                      </div>
                  </div>

                  <!-- Arrow Icon (Visual) -->
                  <div class="flex flex-col justify-center text-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                      </svg>
                  </div>

                  <!-- Right: Selected Tags -->
                  <div class="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                       <div class="p-3 border-b border-gray-200 bg-indigo-50 font-medium text-indigo-900 flex justify-between items-center">
                          <span>{{ t('templateManager.selectedTags') }}</span>
                          <span class="text-xs text-indigo-600">{{ t('templateManager.clickToRemove') }}</span>
                      </div>
                      <div class="flex-1 overflow-y-auto p-4">
                          <div v-if="selectedTemplate.filterRules.includeTags.length === 0" class="text-center text-gray-400 mt-10">
                              {{ t('templateManager.noTagsSelected') }}.
                          </div>
                          <div class="flex flex-wrap gap-2">
                              <button 
                                v-for="tag in selectedTemplate.filterRules.includeTags" 
                                :key="tag"
                                @click="toggleTag(tag)"
                                class="text-sm px-3 py-1 rounded-full border bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors group flex items-center gap-1"
                              >
                                  {{ tag }}
                                  <span class="text-indigo-400 group-hover:text-red-400">&times;</span>
                              </button>
                          </div>
                      </div>
                  </div>

              </div>

          </div>

          <div v-else class="h-full flex flex-col items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mb-4 opacity-20">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p>{{ t('templateManager.selectTemplateToEdit') }}</p>
          </div>
      </div>

      <!-- 重命名模板对话框 -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="showRenameTemplateDialog" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" @click="cancelRenameTemplate"></div>

            <!-- Modal -->
            <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all scale-100" @click.stop>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                {{ t('templateManager.renameTemplate') }}
              </h3>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ t('templateManager.newTemplateName') }}
                </label>
                <input
                  v-model="editingTemplateName"
                  type="text"
                  class="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  @keydown.enter="confirmRenameTemplate"
                  @keydown.esc="cancelRenameTemplate"
                  autofocus
                />
              </div>
              
              <div class="flex items-center justify-end gap-3">
                <button 
                  @click="cancelRenameTemplate"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  {{ t('btn.cancel') }}
                </button>
                <button 
                  @click="confirmRenameTemplate"
                  class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                >
                  {{ t('btn.confirm') }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Hover Preview Popover -->
      <HoverPreviewPopover
          v-if="uiStore.quickPreviewMode && hoveredTemplate"
          type="template"
          :data="hoveredTemplate"
          position="follow"
      />

      <!-- Template Settings Popover -->
      <TemplateSettingsPopover
          v-if="showSettings"
          :triggerElement="settingsBtnRef"
          @close="showSettings = false"
      />
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .transform,
.modal-leave-active .transform {
  transition: transform 0.2s ease;
}

.modal-enter-from .transform,
.modal-leave-to .transform {
  transform: scale(0.95);
}
</style>
