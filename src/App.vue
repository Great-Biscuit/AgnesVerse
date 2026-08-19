<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import ImageGen from './ImageGen/index.vue'
import VideoGen from './VideoGen/index.vue'
import Settings from './Settings/index.vue'
import History from './History/index.vue'

const route = ref('image')
const enterAction = ref({})

onMounted(() => {
  if (!window.utools) {
    console.error('uTools API not available')
    return
  }
  window.utools.onPluginEnter((action) => {
    route.value = action.code
    enterAction.value = action
  })
  window.utools.onPluginOut(() => {
    route.value = ''
  })
})

const switchTab = (tab) => {
  route.value = tab
}
</script>

<template>
  <div class="app">
    <nav class="nav-bar">
      <span class="nav-brand">Agnes AI</span>
      <button
        :class="['nav-btn', { active: route === 'image' }]"
        @click="switchTab('image')"
      >图片生成</button>
      <button
        :class="['nav-btn', { active: route === 'video' }]"
        @click="switchTab('video')"
      >视频生成</button>
      <button
        :class="['nav-btn', { active: route === 'history' }]"
        @click="switchTab('history')"
      >历史记录</button>
      <button
        :class="['nav-btn', { active: route === 'settings' }]"
        @click="switchTab('settings')"
      >设置</button>
    </nav>
    <div class="content">
      <ImageGen v-if="route === 'image'" :enterAction="enterAction" />
      <VideoGen v-else-if="route === 'video'" :enterAction="enterAction" />
      <History v-else-if="route === 'history'" :enterAction="enterAction" />
      <Settings v-else-if="route === 'settings'" :enterAction="enterAction" />
    </div>
  </div>
</template>
