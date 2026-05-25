<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id as string)
</script>

<template>
  <Calendar :id="id" />
</template>
