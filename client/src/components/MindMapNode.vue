<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  node: Object,
  depth: Number,
  index: Number,
  colors: Array,
  focusedPath: String,
  path: String,
})

const emit = defineEmits(['toggleFocus'])
const expanded = ref(true)

const color = computed(() => props.colors[(props.depth + 1) % props.colors.length])
const children = computed(() => props.node?.children || [])
const hasChildren = computed(() => children.value.length > 0)
const dimmed = computed(() => props.focusedPath && !props.path.startsWith(props.focusedPath) && props.path !== props.focusedPath)
const focused = computed(() => props.focusedPath === props.path)

function handleCardClick() {
  if (hasChildren.value) {
    expanded.value = !expanded.value
  } else {
    emit('toggleFocus', props.path)
  }
}

function handleFocus(e) {
  e.stopPropagation()
  emit('toggleFocus', props.path)
}
</script>

<template>
  <div :class="['node-wrapper', { dimmed, focused }]">
    <div
      :class="['node-card', { expandable: hasChildren, expanded }]"
      :style="{
        borderColor: color.border,
        background: focused ? color.bg : 'transparent',
        borderWidth: focused ? '2px' : '1px',
      }"
      @click="handleCardClick"
      @dblclick="handleFocus"
    >
      <button v-if="hasChildren" class="expand-btn" :style="{ color: color.accent }">
        {{ expanded ? '\u25BC' : '\u25B6' }}
      </button>
      <div class="card-body">
        <span class="card-topic" :style="{ color: focused ? color.accent : '#c9d1d9' }">
          {{ node.topic }}
        </span>
        <span v-if="node.detail" class="card-detail">{{ node.detail }}</span>
      </div>
    </div>

    <div v-if="hasChildren && expanded" class="children">
      <MindMapNode
        v-for="(child, i) in children"
        :key="i"
        :node="child"
        :depth="depth + 1"
        :index="i"
        :colors="colors"
        :focused-path="focusedPath"
        :path="`${path}-${i}`"
        @toggle-focus="emit('toggleFocus', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.node-wrapper {
  margin-left: 0;
  transition: opacity 0.3s;
  border-left: 1px solid #21262d;
  padding-left: 16px;
  margin-bottom: 2px;
}

.node-wrapper.dimmed {
  opacity: 0.25;
}

.node-wrapper.focused {
  opacity: 1;
}

.node-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
  max-width: 480px;
}

.node-card:hover {
  filter: brightness(1.15);
}

.node-card.expandable {
  border-style: solid;
}

.expand-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  font-size: 0.625rem;
  cursor: pointer;
  padding: 3px 0 0 0;
  width: 14px;
  text-align: center;
  line-height: 1;
}

.card-body {
  min-width: 0;
}

.card-topic {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
}

.card-detail {
  display: block;
  font-size: 0.75rem;
  color: #8b949e;
  margin-top: 3px;
  line-height: 1.4;
}

.children {
  margin-top: 2px;
}
</style>
