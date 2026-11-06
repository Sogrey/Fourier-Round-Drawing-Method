<script setup>
import { computed } from "vue";
import katex from "katex";

const props = defineProps({
  tex: {
    type: String,
    required: true,
  },
  display: {
    type: Boolean,
    default: false,
  },
});

const html = computed(() => {
  try {
    return katex.renderToString(props.tex, {
      throwOnError: false,
      displayMode: props.display,
      strict: "ignore",
    });
  } catch {
    return props.tex;
  }
});
</script>

<template>
  <span class="katex-host" :class="{ display }" v-html="html" />
</template>

<style scoped>
.katex-host.display {
  display: block;
  overflow-x: auto;
  overflow-y: hidden;
}

.katex-host :deep(.katex) {
  font-size: 1.05em;
}

.katex-host.display :deep(.katex) {
  font-size: 1.12em;
}
</style>
