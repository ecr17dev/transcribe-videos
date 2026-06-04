<script setup>
import { ref } from 'vue'

const props = defineProps({ data: Object })
const focusedPath = ref(null)

const COLORS = [
  { bg: '#1a2332', border: '#58a6ff', accent: '#58a6ff' },
  { bg: '#1a2e1a', border: '#3fb950', accent: '#3fb950' },
  { bg: '#2a1f1a', border: '#d29922', accent: '#d29922' },
  { bg: '#2a1a2a', border: '#a371f7', accent: '#a371f7' },
  { bg: '#1a262a', border: '#79c0ff', accent: '#79c0ff' },
  { bg: '#28201a', border: '#f0883e', accent: '#f0883e' },
]

const rootChildren = computedChildren(() => props.data?.children || [], [])

function computedChildren(getter) {
  try {
    return getter()
  } catch {
    return []
  }
}

function colorForDepth(depth) {
  return COLORS[depth % COLORS.length]
}

function toggleFocus(path) {
  focusedPath.value = focusedPath.value === path ? null : path
}

function isFocused(path) {
  if (!focusedPath.value) return false
  return focusedPath.value === path
}

function isDimmed(path) {
  if (!focusedPath.value) return false
  return !path.startsWith(focusedPath.value)
}
</script>

<template>
  <div class="mindmap-view">
    <div class="toolbar">
      <span class="label">Mapa mental</span>
      <span class="hint">Haz clic en un nodo para enfocar esa rama</span>
    </div>

    <div v-if="!data || !rootChildren.length" class="empty-state">
      No hay mapa mental disponible
    </div>

    <div v-else class="mindmap-canvas" :class="{ focused: !!focusedPath }">
      <div class="root-node" :style="{ borderColor: COLORS[0].border, background: COLORS[0].bg }">
        <span class="root-title">{{ data?.title || 'Mapa Mental' }}</span>
      </div>

      <div class="tree">
        <MindMapNode
          v-for="(child, i) in rootChildren"
          :key="i"
          :node="child"
          :depth="0"
          :index="i"
          :colors="COLORS"
          :focused-path="focusedPath"
          :path="`${i}`"
          @toggle-focus="toggleFocus"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mindmap-view {
  padding: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #21262d;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
}

.hint {
  font-size: 0.75rem;
  color: #484f58;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #484f58;
  font-style: italic;
}

.mindmap-canvas {
  padding: 24px;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 550px;
}

.root-node {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: 20px;
  border: 2px solid;
  margin-bottom: 28px;
  transition: opacity 0.3s;
}

.root-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #e6edf3;
}

.tree {
  padding-left: 4px;
}

.focused .root-node {
  opacity: 0.4;
}
</style>
