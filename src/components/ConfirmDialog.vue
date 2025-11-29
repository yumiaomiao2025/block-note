<script setup lang="ts">
import { useUIStore } from '../stores/uiStore';

const uiStore = useUIStore();

function handleConfirm() {
  uiStore.confirmDialog.onConfirm();
  uiStore.closeConfirm();
}

function handleCancel() {
  if (uiStore.confirmDialog.onCancel) {
    uiStore.confirmDialog.onCancel();
  }
  uiStore.closeConfirm();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="uiStore?.confirmDialog?.isOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" @click="handleCancel"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6 transform transition-all scale-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            {{ uiStore.confirmDialog.title }}
          </h3>
          <p class="text-gray-600 text-sm mb-6">
            {{ uiStore.confirmDialog.message }}
          </p>
          
          <div class="flex items-center justify-end gap-3">
            <button 
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {{ uiStore.confirmDialog.cancelText }}
            </button>
            <button 
              @click="handleConfirm"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm"
            >
              {{ uiStore.confirmDialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

