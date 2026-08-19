<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'

const records = ref([])
const filter = ref('all')
const selectedId = ref(null)
const showClearConfirm = ref(false)

const filtered = computed(() => {
  if (filter.value === 'all') return records.value
  return records.value.filter(r => r.type === filter.value)
})

const selected = computed(() => {
  return records.value.find(r => r.id === selectedId.value) || null
})

const stats = computed(() => {
  return {
    total: records.value.length,
    images: records.value.filter(r => r.type === 'image').length,
    videos: records.value.filter(r => r.type === 'video').length
  }
})

const loadHistory = () => {
  records.value = window.services?.getHistory?.({ limit: 200 }) || []
}

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

const truncate = (str, len = 60) => {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

const deleteRecord = (id) => {
  window.services?.deleteHistory?.(id)
  if (selectedId.value === id) selectedId.value = null
  loadHistory()
}

const clearAll = () => {
  window.services?.clearHistory?.()
  records.value = []
  selectedId.value = null
  showClearConfirm.value = false
}

const copyPrompt = (text) => {
  if (!text) return
  window.utools?.copyText?.(text)
  window.utools?.showNotification?.('提示词已复制')
}

const downloadResult = async (record) => {
  const url = record.results?.[0]?.url
  if (!url) return
  try {
    let filePath
    if (record.type === 'image') {
      filePath = await window.services.downloadImage(url)
    } else {
      filePath = await window.services.downloadVideo(url)
    }
    window.services.showInFolder(filePath)
    window.utools?.showNotification?.('已保存到下载文件夹')
  } catch (err) {
    window.utools?.showNotification?.(`保存失败：${err.message}`)
  }
}

const openExternal = (url) => {
  window.services?.openExternal?.(url)
}

const getParamSummary = (record) => {
  if (record.type === 'image') {
    const parts = [record.params?.size || record.params?.model || '']
    if (record.params?.model) parts.push(record.params.model)
    return parts.filter(Boolean).join(' · ')
  }
  const parts = []
  if (record.params?.aspectRatio) parts.push(record.params.aspectRatio)
  if (record.params?.duration) parts.push(`${record.params.duration}s`)
  return parts.join(' · ')
}

const getFirstResult = (record) => {
  return record.results?.[0] || null
}

onMounted(() => {
  loadHistory()
})
</script>

<template>
  <div class="history-page">
    <div class="history-sidebar">
      <div class="filter-bar">
        <div class="filter-tabs">
          <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
            全部 <span class="count">{{ stats.total }}</span>
          </button>
          <button :class="{ active: filter === 'image' }" @click="filter = 'image'">
            图片 <span class="count">{{ stats.images }}</span>
          </button>
          <button :class="{ active: filter === 'video' }" @click="filter = 'video'">
            视频 <span class="count">{{ stats.videos }}</span>
          </button>
        </div>
        <button v-if="records.length > 0" class="clear-btn" @click="showClearConfirm = true">
          清空
        </button>
      </div>

      <div class="records-list">
        <div v-if="filtered.length === 0" class="empty-state">
          <div class="empty-icon">&#128218;</div>
          <div class="empty-text">暂无历史记录</div>
        </div>

        <div
          v-for="record in filtered"
          :key="record.id"
          :class="['record-item', { selected: selectedId === record.id }]"
          @click="selectedId = record.id"
        >
          <div class="record-thumb">
            <img v-if="record.type === 'image' && getFirstResult(record)?.url" :src="getFirstResult(record).url" loading="lazy" />
            <div v-else-if="record.type === 'video'" class="thumb-video">&#127916;</div>
            <div v-else class="thumb-placeholder">&#128247;</div>
          </div>
          <div class="record-info">
            <div class="record-prompt">{{ truncate(record.prompt, 40) }}</div>
            <div class="record-meta">
              <span class="record-type">{{ record.type === 'image' ? '图片' : '视频' }}</span>
              <span class="record-params">{{ getParamSummary(record) }}</span>
              <span class="record-time">{{ formatTime(record.createdAt) }}</span>
            </div>
          </div>
          <button class="delete-btn" @click.stop="deleteRecord(record.id)" title="删除">&#10005;</button>
        </div>
      </div>
    </div>

    <div class="detail-panel">
      <div v-if="!selected" class="detail-empty">
        <div class="empty-icon">&#128269;</div>
        <div class="empty-text">选择左侧记录查看详情</div>
      </div>

      <div v-else class="detail-content">
        <div class="detail-header">
          <span class="detail-type-badge" :class="selected.type">
            {{ selected.type === 'image' ? '图片生成' : '视频生成' }}
          </span>
          <span class="detail-time">{{ formatTime(selected.createdAt) }}</span>
        </div>

        <div class="detail-section">
          <div class="detail-label">提示词</div>
          <div class="detail-value" @click="copyPrompt(selected.prompt)">{{ selected.prompt }}</div>
        </div>

        <div v-if="selected.negativePrompt" class="detail-section">
          <div class="detail-label">负面提示词</div>
          <div class="detail-value">{{ selected.negativePrompt }}</div>
        </div>

        <div class="detail-section">
          <div class="detail-label">参数</div>
          <div class="params-grid">
            <div v-for="(val, key) in selected.params" :key="key" class="param-item">
              <span class="param-key">{{ key }}</span>
              <span class="param-val">{{ val }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-label">结果</div>
          <div class="result-preview">
            <template v-for="(result, i) in selected.results" :key="i">
              <div v-if="selected.type === 'image'" class="result-image-box">
                <img v-if="result.url" :src="result.url" loading="lazy" @click="openExternal(result.url)" />
                <div v-else-if="result.b64_json" >
                  <img :src="'data:image/png;base64,' + result.b64_json" loading="lazy" @click="copyPrompt(result.b64_json)" />
                </div>
              </div>
              <div v-else class="result-video-box">
                <video v-if="result.url" :src="result.url" controls loop></video>
                <div v-else class="result-missing">视频链接不可用</div>
              </div>
            </template>
          </div>
          <div class="detail-actions">
            <button @click="downloadResult(selected)">下载</button>
            <button class="btn-secondary" @click="copyPrompt(selected.prompt)">复制提示词</button>
            <button class="btn-secondary" @click="openExternal(getFirstResult(selected)?.url)" v-if="getFirstResult(selected)?.url">在浏览器打开</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showClearConfirm" class="modal-overlay" @click="showClearConfirm = false">
      <div class="modal-box" @click.stop>
        <p>确认清空所有历史记录？此操作不可撤销。</p>
        <div class="modal-actions">
          <button class="btn-danger" @click="clearAll">确认清空</button>
          <button @click="showClearConfirm = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  display: flex;
  gap: 0;
  height: 100%;
  min-height: 500px;
}

.history-sidebar {
  width: 340px;
  min-width: 340px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tabs button {
  padding: 4px 10px;
  font-size: 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.filter-tabs button.active {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary);
}

.filter-tabs .count {
  font-size: 11px;
  opacity: 0.6;
  margin-left: 2px;
}

.clear-btn {
  font-size: 12px;
  color: var(--danger);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}
.clear-btn:hover { text-decoration: underline; }

.records-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.record-item:hover { background: var(--bg); }
.record-item.selected { background: var(--primary-light); }

.record-thumb {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}

.record-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-video, .thumb-placeholder {
  font-size: 20px;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-prompt {
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.record-meta {
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.record-type {
  background: var(--bg);
  padding: 1px 6px;
  border-radius: 3px;
}

.delete-btn {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}

.record-item:hover .delete-btn { opacity: 1; }
.delete-btn:hover { background: var(--danger-bg); color: var(--danger); }

.detail-panel {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.detail-empty, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
}

.empty-state { padding: 40px 20px; }
.empty-icon { font-size: 36px; margin-bottom: 8px; }
.empty-text { font-size: 13px; }

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.detail-type-badge {
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
}
.detail-type-badge.image { background: var(--primary-light); color: var(--primary); }
.detail-type-badge.video { background: var(--success-bg); color: #52c41a; }

.detail-time { font-size: 12px; color: var(--text-tertiary); }

.detail-section { margin-bottom: 16px; }

.detail-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 14px;
  color: var(--text);
  line-height: 1.6;
  background: var(--bg);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.detail-value:hover { background: var(--bg-input); }

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  background: var(--bg);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.param-key { color: var(--text-tertiary); }
.param-val { color: var(--text); font-weight: 500; }

.result-preview {
  margin-bottom: 12px;
}

.result-image-box, .result-video-box {
  margin-bottom: 8px;
}

.result-image-box img {
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radius);
  cursor: pointer;
  display: block;
}

.result-video-box video {
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radius);
}

.result-missing {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
  background: var(--bg);
  border-radius: var(--radius-sm);
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: var(--bg-card);
  padding: 24px;
  border-radius: var(--radius);
  max-width: 360px;
  text-align: center;
}

.modal-box p {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--text);
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-danger {
  background: #ff4d4f;
  color: #fff;
  border: none;
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
}
.btn-danger:hover { background: #ff7875; }
</style>
