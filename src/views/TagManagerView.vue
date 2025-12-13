<script setup lang="ts">
import { ref, computed, nextTick, Teleport } from 'vue';
import { useNoteStore } from '../stores/noteStore';
import { useUIStore } from '../stores/uiStore';
import HoverPreviewPopover from '../components/HoverPreviewPopover.vue';
import type { TagGroup } from '../types/models';

const store = useNoteStore();
const uiStore = useUIStore();

const selectedGroupId = ref<string | 'uncategorized'>('uncategorized');
const newGroupName = ref('');
const newTagInput = ref('');
const searchQuery = ref('');
const highlightedId = ref<string | null>(null);

// Hover Preview Logic (for Quick Preview Mode)
const hoveredTagGroup = ref<TagGroup | null>(null);

// 标签组重命名相关
const editingGroupId = ref<string | null>(null);
const editingGroupName = ref('');

// 重命名标签对话框
const showRenameTagDialog = ref(false);
const renameTagOldName = ref('');
const renameTagNewName = ref('');

// 用于滚动定位的ref
const groupRefs = ref<Record<string, HTMLElement>>({});
const tagRefs = ref<Record<string, HTMLElement>>({});
const uncategorizedRef = ref<HTMLElement | null>(null);

// --- Computed ---
const displayedTags = computed(() => {
    let tags: string[] = [];
    if (selectedGroupId.value === 'uncategorized') {
        tags = store.uncategorizedTags;
    } else {
        const group = store.tagGroups.find(g => g.id === selectedGroupId.value);
        tags = group ? group.tags : [];
    }

    // 如果有搜索关键词，过滤标签
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        return tags.filter(tag => tag.toLowerCase().includes(query));
    }
    return tags;
});

// 搜索结果计算属性
const searchResults = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return [];

    const results: Array<{
        type: 'group' | 'tag';
        id: string;
        name: string;
        groupName?: string;
        groupId?: string;
    }> = [];

    // 搜索标签组（包括Uncategorized）
    if ('uncategorized'.includes(query)) {
        results.push({
            type: 'group',
            id: 'uncategorized',
            name: 'Uncategorized'
        });
    }
    
    store.tagGroups.forEach(group => {
        if (group.name.toLowerCase().includes(query)) {
            results.push({
                type: 'group',
                id: group.id,
                name: group.name
            });
        }
    });

    // 搜索标签
    store.allTags.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
            // 找到标签所属的标签组
            const group = store.tagGroups.find(g => g.tags.includes(tag));
            if (group) {
                results.push({
                    type: 'tag',
                    id: tag,
                    name: tag,
                    groupName: group.name,
                    groupId: group.id
                });
            } else {
                // uncategorized 标签
                results.push({
                    type: 'tag',
                    id: tag,
                    name: tag,
                    groupName: 'Uncategorized'
                });
            }
        }
    });

    return results;
});

// 标签组列表（始终显示所有标签组，搜索只用于高亮）
const filteredTagGroups = computed(() => {
    // 始终返回所有标签组，不进行过滤
    // 搜索功能只用于高亮显示和右侧标签过滤
    return store.tagGroups;
});

const selectedGroupName = computed(() => {
    if (selectedGroupId.value === 'uncategorized') return 'Uncategorized';
    return store.tagGroups.find(g => g.id === selectedGroupId.value)?.name || 'Unknown';
});

// 检查是否匹配搜索关键词（用于高亮）
function matchesSearch(text: string): boolean {
    if (!searchQuery.value.trim()) return false;
    return text.toLowerCase().includes(searchQuery.value.trim().toLowerCase());
}

// --- Actions ---
function createGroup() {
    if (newGroupName.value.trim()) {
        store.createTagGroup(newGroupName.value.trim());
        newGroupName.value = '';
    }
}

function deleteGroup(id: string) {
    const group = store.tagGroups.find(g => g.id === id);
    if (!group) return;

    // 统计组内标签的使用情况
    let totalUsage = 0;
    group.tags.forEach(tag => {
        totalUsage += store.getTagUsageCount(tag);
    });

    const message = group.tags.length > 0
        ? `确定要删除标签组"${group.name}"吗？\n\n该标签组包含 ${group.tags.length} 个标签，其中共有 ${totalUsage} 个笔记正在使用这些标签。\n\n删除后，组内所有标签将变为未分类状态，相关笔记中的标签将被保留。`
        : `确定要删除标签组"${group.name}"吗？\n\n该标签组目前没有标签。`;

    uiStore.showConfirm({
        title: '删除标签组',
        message: message,
        confirmText: '删除',
        cancelText: '取消',
        onConfirm: () => {
            store.deleteTagGroup(id);
            if (selectedGroupId.value === id) {
                selectedGroupId.value = 'uncategorized';
            }
        }
    });
}

function createTag() {
    if (!newTagInput.value.trim()) return;
    const tag = newTagInput.value.trim();
    
    if (selectedGroupId.value !== 'uncategorized') {
        store.addTagToGroup(selectedGroupId.value, tag);
    } else {
        // 直接添加到normalTagSystem，会自动出现在uncategorized列表中
        if (!store.normalTagSystem.includes(tag)) {
            store.normalTagSystem.push(tag);
        }
    }
    newTagInput.value = '';
}

function deleteTag(tag: string) {
    const usageCount = store.getTagUsageCount(tag);
    const message = `确定要删除标签"${tag}"吗？\n\n共有 ${usageCount} 个笔记正在使用此标签。\n\n删除后，将从所有笔记和标签组中移除该标签。如需查看使用此标签的笔记，请前往首页查看。`;

    uiStore.showConfirm({
        title: '删除标签',
        message: message,
        confirmText: '删除',
        cancelText: '取消',
        onConfirm: () => {
            store.deleteTagGlobal(tag);
        }
    });
}

function renameTag(oldTag: string) {
    renameTagOldName.value = oldTag;
    renameTagNewName.value = oldTag;
    showRenameTagDialog.value = true;
}

function confirmRenameTag() {
    const oldTag = renameTagOldName.value;
    const newTag = renameTagNewName.value.trim();
    
    if (!newTag || newTag === oldTag) {
        showRenameTagDialog.value = false;
        return;
    }
    
    const usageCount = store.getTagUsageCount(oldTag);
    
    uiStore.showConfirm({
        title: '确认重命名',
        message: `确定要将标签"${oldTag}"重命名为"${newTag}"吗？\n\n共有 ${usageCount} 个笔记正在使用此标签，重命名后将同步更新所有笔记和标签组中的该标签。如需查看使用此标签的笔记，请前往首页查看。`,
        confirmText: '确定',
        cancelText: '取消',
        onConfirm: () => {
            store.renameTagGlobal(oldTag, newTag);
            showRenameTagDialog.value = false;
            renameTagOldName.value = '';
            renameTagNewName.value = '';
        },
        onCancel: () => {
            // 不关闭输入对话框，允许用户修改
        }
    });
}

function cancelRenameTag() {
    showRenameTagDialog.value = false;
    renameTagOldName.value = '';
    renameTagNewName.value = '';
}

// 标签组重命名
function startRenameGroup(groupId: string) {
    const group = store.tagGroups.find(g => g.id === groupId);
    if (group) {
        editingGroupId.value = groupId;
        editingGroupName.value = group.name;
        nextTick(() => {
            const input = document.getElementById(`rename-input-${groupId}`) as HTMLInputElement;
            if (input) {
                input.focus();
                input.select();
            }
        });
    }
}

function confirmRenameGroup() {
    if (editingGroupId.value && editingGroupName.value.trim()) {
        const oldName = store.tagGroups.find(g => g.id === editingGroupId.value)?.name;
        if (oldName !== editingGroupName.value.trim()) {
            store.updateTagGroup(editingGroupId.value, { name: editingGroupName.value.trim() });
        }
    }
    editingGroupId.value = null;
    editingGroupName.value = '';
}

function cancelRenameGroup() {
    editingGroupId.value = null;
    editingGroupName.value = '';
}

// 搜索相关功能
function handleSearchResultClick(result: typeof searchResults.value[0]) {
    highlightedId.value = result.id;
    
    if (result.type === 'group') {
        selectedGroupId.value = result.id;
        nextTick(() => {
            let element: HTMLElement | null = null;
            if (result.id === 'uncategorized') {
                element = uncategorizedRef.value;
            } else {
                element = groupRefs.value[result.id] || null;
            }
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 移除高亮（可选，3秒后移除）
                setTimeout(() => {
                    if (highlightedId.value === result.id) {
                        highlightedId.value = null;
                    }
                }, 3000);
            }
        });
    } else {
        // 跳转到标签所在的标签组
        if (result.groupId) {
            selectedGroupId.value = result.groupId;
        } else {
            selectedGroupId.value = 'uncategorized';
        }
        nextTick(() => {
            const element = tagRefs.value[result.id];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 移除高亮
                setTimeout(() => {
                    if (highlightedId.value === result.id) {
                        highlightedId.value = null;
                    }
                }, 3000);
            }
        });
    }
    
    // 清空搜索
    searchQuery.value = '';
}

// --- DnD ---
function onDragStart(event: DragEvent, tag: string) {
    if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', tag);
        event.dataTransfer.setData('source-group', selectedGroupId.value);
    }
}

function onDropGroup(event: DragEvent, targetGroupId: string) {
    const tag = event.dataTransfer?.getData('text/plain');
    const sourceGroupId = event.dataTransfer?.getData('source-group');
    
    if (tag && sourceGroupId) {
        if (targetGroupId === sourceGroupId) return;
        
        // Add to target
        store.addTagToGroup(targetGroupId, tag);
        
        // Remove from source (if source was a group)
        // If source was 'uncategorized', it automatically disappears from uncategorized list when added to a group.
        if (sourceGroupId !== 'uncategorized') {
             store.removeTagFromGroup(sourceGroupId, tag);
        }
    }
}
</script>

<template>
  <div class="flex h-full bg-white">
      <!-- Left Sidebar: Groups -->
      <div class="w-64 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
          <div class="p-4 border-b border-gray-200 bg-white">
              <h2 class="font-bold text-lg text-gray-800">Groups</h2>
              <div class="mt-2 flex gap-2">
                  <input 
                    v-model="newGroupName" 
                    placeholder="New Group Name"
                    class="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    @keydown.enter="createGroup"
                  />
                  <button @click="createGroup" class="bg-indigo-600 text-white px-2.5 py-1 rounded text-sm hover:bg-indigo-700">+</button>
              </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2 space-y-1">
              <!-- Uncategorized -->
              <div 
                ref="uncategorizedRef"
                @click="selectedGroupId = 'uncategorized'"
                class="px-3 py-2 rounded cursor-pointer flex justify-between items-center transition-colors"
                :class="[
                  selectedGroupId === 'uncategorized' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-700',
                  highlightedId === 'uncategorized' ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
                ]"
              >
                  <div class="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 opacity-70">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                      </svg>
                      <span :class="matchesSearch('Uncategorized') ? 'bg-yellow-200 px-1 rounded' : ''">Uncategorized</span>
                  </div>
                  <span class="text-xs bg-white/50 px-1.5 rounded-full text-gray-600">{{ store.uncategorizedTags.length }}</span>
              </div>

              <!-- User Groups -->
              <div 
                v-for="group in filteredTagGroups" 
                :key="group.id"
                :ref="el => { if (el) groupRefs[group.id] = el as HTMLElement }"
                @click="selectedGroupId = group.id"
                @mouseenter="uiStore.quickPreviewMode && (hoveredTagGroup = group)"
                @mouseleave="uiStore.quickPreviewMode && (hoveredTagGroup = null)"
                @dragover.prevent
                @drop="onDropGroup($event, group.id)"
                class="px-3 py-2 rounded cursor-pointer flex justify-between items-center group transition-colors"
                :class="[
                  selectedGroupId === group.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-700',
                  highlightedId === group.id ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
                ]"
              >
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 opacity-70 shrink-0">
                        <path d="M3.75 3a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75H4c.414 0 .75-.336.75-.75v-.5a.75.75 0 00-.75-.75h-.25zM3.75 9a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75H4c.414 0 .75-.336.75-.75v-.5a.75.75 0 00-.75-.75h-.25zM3.75 15a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75H4c.414 0 .75-.336.75-.75v-.5a.75.75 0 00-.75-.75h-.25zM7.5 3a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h9.25a.75.75 0 00.75-.75v-.5a.75.75 0 00-.75-.75H7.5zM6.75 9.75a.75.75 0 01.75-.75h9.25a.75.75 0 01.75.75v.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75v-.5zM6.75 15.75a.75.75 0 01.75-.75h9.25a.75.75 0 01.75.75v.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75v-.5z" />
                      </svg>
                      <span v-if="editingGroupId !== group.id" class="truncate" :class="matchesSearch(group.name) ? 'bg-yellow-200 px-1 rounded' : ''">{{ group.name }}</span>
                      <input
                        v-else
                        :id="`rename-input-${group.id}`"
                        v-model="editingGroupName"
                        @keydown.enter="confirmRenameGroup"
                        @keydown.esc="cancelRenameGroup"
                        @blur="confirmRenameGroup"
                        class="text-sm border border-indigo-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                        @click.stop
                      />
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                       <span class="text-xs bg-white/50 px-1.5 rounded-full text-gray-600">{{ group.tags.length }}</span>
                       <button 
                         v-if="editingGroupId !== group.id"
                         @click.stop="startRenameGroup(group.id)" 
                         class="text-gray-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                         title="重命名"
                       >
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                             <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                           </svg>
                       </button>
                       <button @click.stop="deleteGroup(group.id)" class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                           &times;
                       </button>
                  </div>
              </div>
          </div>
      </div>

      <!-- Right Main: Tag Pool -->
      <div class="flex-1 flex flex-col h-full overflow-hidden">
          <!-- Header -->
          <div class="p-6 border-b border-gray-200 bg-white shrink-0">
              <div class="mb-4">
                  <!-- 搜索框 -->
                  <div class="relative">
                      <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="搜索标签组和标签..."
                        class="w-full border rounded-md px-4 py-2 pl-10 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2">
                        <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
                      </svg>
                      
                      <!-- 搜索结果下拉列表 -->
                      <div
                        v-if="searchQuery.trim() && searchResults.length > 0"
                        class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto"
                      >
                          <div
                            v-for="result in searchResults"
                            :key="`${result.type}-${result.id}`"
                            @click="handleSearchResultClick(result)"
                            class="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                              <div class="flex items-center justify-between">
                                  <div class="flex items-center gap-2 flex-1 min-w-0">
                                      <span
                                        class="text-xs px-2 py-0.5 rounded"
                                        :class="result.type === 'group' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'"
                                      >
                                          {{ result.type === 'group' ? '标签组' : '标签' }}
                                      </span>
                                      <span class="font-medium text-gray-900 truncate">{{ result.name }}</span>
                                  </div>
                                  <div v-if="result.type === 'tag' && result.groupName" class="text-xs text-gray-500 ml-2 shrink-0">
                                      位于: {{ result.groupName }}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              
              <div class="flex justify-between items-center">
                  <div>
                      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
                          {{ selectedGroupName }}
                          <span class="text-sm font-normal text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">{{ displayedTags.length }} tags</span>
                      </h1>
                      <p class="text-sm text-gray-500 mt-1">Manage tags for this group.</p>
                  </div>
                  
                  <div class="flex items-center gap-2">
                       <input 
                         v-model="newTagInput" 
                         placeholder="Add new tag..." 
                         class="border rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                         @keydown.enter="createTag"
                       />
                       <button @click="createTag" class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors">
                           Add Tag
                       </button>
                  </div>
              </div>
          </div>

          <!-- Tag Grid -->
          <div class="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <div v-if="displayedTags.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mb-4 opacity-20">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a22.53 22.53 0 003.744-3.744c.542-.826.369-1.908-.33-2.607L9.568 3z" />
                  </svg>
                  <p class="text-lg font-medium text-gray-500">No tags here yet</p>
                  <p class="text-sm mt-1" v-if="selectedGroupId === 'uncategorized'">All your tags are neatly organized in groups!</p>
                  <p class="text-sm mt-1" v-else>Drag uncategorized tags here or create a new one.</p>
              </div>
              
              <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 auto-rows-min">
                  <div 
                    v-for="tag in displayedTags" 
                    :key="tag"
                    :ref="el => { if (el) tagRefs[tag] = el as HTMLElement }"
                    draggable="true"
                    @dragstart="onDragStart($event, tag)"
                    class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all group relative flex flex-col cursor-grab active:cursor-grabbing"
                    :class="highlightedId === tag ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''"
                  >
                      <div class="font-medium text-gray-800 truncate mb-4 select-none" :title="tag">
                          <span :class="matchesSearch(tag) ? 'bg-yellow-200 px-1 rounded' : ''">{{ tag }}</span>
                      </div>
                      
                      <div class="mt-auto flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-gray-100">
                          <button @click="renameTag(tag)" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 hover:bg-indigo-50 rounded">Rename</button>
                          <button @click="deleteTag(tag)" class="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded">Delete</button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <!-- 重命名标签对话框 -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="showRenameTagDialog" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" @click="cancelRenameTag"></div>

            <!-- Modal -->
            <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all scale-100" @click.stop>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                重命名标签
              </h3>
              <div class="mb-4">
                <p class="text-gray-600 text-sm mb-3">
                  当前标签：<span class="font-medium text-gray-900">{{ renameTagOldName }}</span>
                </p>
                <p class="text-gray-600 text-sm mb-4">
                  共有 {{ store.getTagUsageCount(renameTagOldName) }} 个笔记正在使用此标签。重命名后，所有笔记和标签组中的该标签将被同步更新。如需查看使用此标签的笔记，请前往首页查看。
                </p>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  新标签名称：
                </label>
                <input
                  v-model="renameTagNewName"
                  type="text"
                  class="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  @keydown.enter="confirmRenameTag"
                  @keydown.esc="cancelRenameTag"
                  autofocus
                />
              </div>
              
              <div class="flex items-center justify-end gap-3">
                <button 
                  @click="cancelRenameTag"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  取消
                </button>
                <button 
                  @click="confirmRenameTag"
                  class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Hover Preview Popover -->
      <HoverPreviewPopover
          v-if="uiStore.quickPreviewMode && hoveredTagGroup"
          type="tagGroup"
          :data="hoveredTagGroup"
          position="follow"
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
