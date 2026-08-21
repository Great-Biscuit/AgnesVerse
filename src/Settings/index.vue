<script lang="ts" setup>
import { ref, onMounted } from 'vue'

const apiKey = ref('')
const saved = ref(false)
const testing = ref(false)
const testResult = ref('')
const testSuccess = ref(false)

onMounted(() => {
  apiKey.value = window.services.getApiKey()
})

const save = () => {
  const ok = window.services.saveApiKey(apiKey.value.trim())
  if (ok) {
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  }
}

const openApiKeysPage = () => {
  window.services.openExternal('https://platform.agnes-ai.com/settings/apiKeys')
}

const openSourceRepo = () => {
  window.services.openExternal('https://github.com/Great-Biscuit/AgnesVerse')
}

const testConnection = async () => {
  if (!apiKey.value.trim()) {
    testResult.value = '请先输入 API Key'
    testSuccess.value = false
    return
  }
  testing.value = true
  testResult.value = ''
  try {
    window.services.saveApiKey(apiKey.value.trim())
    await window.services.generateImage({
      prompt: 'a small red circle',
      size: '1024x1024',
      responseFormat: 'url'
    })
    testResult.value = '连接成功！API Key 有效，可以开始使用了。'
    testSuccess.value = true
  } catch (err) {
    testResult.value = `测试失败：${err.message}`
    testSuccess.value = false
  } finally {
    testing.value = false
  }
}

const apiKeyInfo = [
  { label: 'Base URL', value: 'https://apihub.agnes-ai.com/v1' },
  { label: '认证方式', value: 'Authorization: Bearer {API_KEY}' },
  { label: '图片模型', value: 'agnes-image-2.0-flash / agnes-image-2.1-flash' },
  { label: '视频模型', value: 'agnes-video-v2.0' }
]
</script>

<template>
  <div class="settings">
    <div class="opensource-box">
      <span class="opensource-label">开源地址：</span>
      <a class="opensource-link" @click="openSourceRepo">https://github.com/Great-Biscuit/AgnesVerse</a>
    </div>

    <div class="guide-box">
      <p><strong>使用前请先配置 API Key</strong></p>
      <p>1. 前往 Agnes AI 控制台的
        <a @click="openApiKeysPage">API Key 管理页面</a>
        创建并复制你的 API Key
      </p>
      <p>2. 将复制的 API Key 粘贴到下方输入框，点击保存</p>
      <p>3. 保存后即可在「图片生成」和「视频生成」中使用</p>
    </div>

    <div class="card">
      <div class="form-group">
        <label>Agnes AI API Key</label>
        <input
          type="password"
          v-model="apiKey"
          placeholder="粘贴你的 API Key"
          @keyup.enter="save"
        />
      </div>

      <div class="result-actions">
        <button @click="save" :disabled="!apiKey.trim()">保存</button>
        <button class="btn-secondary" @click="testConnection" :disabled="testing || !apiKey.trim()">
          {{ testing ? '测试中...' : '测试连接' }}
        </button>
        <button class="btn-secondary" @click="openApiKeysPage">打开控制台</button>
      </div>

      <div v-if="saved" class="success-msg">API Key 已保存</div>
      <div v-if="testResult" :class="testSuccess ? 'success-msg' : 'error-msg'">
        {{ testResult }}
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">API 信息</h3>
      <div class="info-grid">
        <div v-for="item in apiKeyInfo" :key="item.label" class="info-row">
          <span class="info-label">{{ item.label }}</span>
          <span class="info-value">{{ item.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings { max-width: 640px; }

.opensource-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.opensource-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.opensource-link {
  color: var(--accent, #4c8eff);
  cursor: pointer;
  font-family: "SF Mono", "Cascadia Code", "Consolas", monospace;
  word-break: break-all;
}

.opensource-link:hover {
  text-decoration: underline;
}

.card-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.info-row {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  padding: 10px 14px;
  gap: 16px;
}

.info-label {
  color: var(--text-secondary);
  width: 100px;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
}

.info-value {
  color: var(--text);
  font-family: "SF Mono", "Cascadia Code", "Consolas", monospace;
  font-size: 13px;
}
</style>
