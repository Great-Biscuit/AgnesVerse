<script lang="ts" setup>
import { ref, onUnmounted } from 'vue'

const mode = ref('t2v')
const prompt = ref('')
const negativePrompt = ref('')
const imageUrl = ref('')
const localImage = ref(null)
const imagePreview = ref('')
const duration = ref('5')
const aspectRatio = ref('16:9')
const seed = ref('')
const loading = ref(false)
const progress = ref(0)
const statusText = ref('')
const resultUrl = ref('')
const error = ref('')
const videoError = ref(false)
const showAdvanced = ref(false)
let pollTimer = null

const durations = [
  { label: '约 3 秒', value: '3', numFrames: 81, frameRate: 24 },
  { label: '约 5 秒', value: '5', numFrames: 121, frameRate: 24 },
  { label: '约 10 秒', value: '10', numFrames: 241, frameRate: 24 },
  { label: '约 18 秒', value: '18', numFrames: 441, frameRate: 24 }
]

const ratios = [
  { label: '720P 16:9 横版 (1152×768)', value: '16:9', width: 1152, height: 768 },
  { label: '720P 9:16 竖版 (768×1152)', value: '9:16', width: 768, height: 1152 },
  { label: '720P 1:1 方形 (896×896)', value: '1:1', width: 896, height: 896 },
  { label: '720P 4:3 横版 (1024×768)', value: '4:3', width: 1024, height: 768 },
  { label: '720P 3:4 竖版 (768×1024)', value: '3:4', width: 768, height: 1024 },
  { label: '1080P 16:9 横版 (1920×1080)', value: '16:9-1080', width: 1920, height: 1080 },
  { label: '1080P 9:16 竖版 (1080×1920)', value: '9:16-1080', width: 1080, height: 1920 },
  { label: '1080P 1:1 方形 (1080×1080)', value: '1:1-1080', width: 1080, height: 1080 }
]

const getDurationConfig = () => durations.find(d => d.value === duration.value)
const getRatioConfig = () => ratios.find(r => r.value === aspectRatio.value)

const onFileSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    localImage.value = reader.result
    imagePreview.value = reader.result
    imageUrl.value = ''
  }
  reader.readAsDataURL(file)
}

const clearImage = () => {
  localImage.value = null
  imagePreview.value = ''
  imageUrl.value = ''
}

const generate = async () => {
  if (!prompt.value.trim()) {
    error.value = '请输入提示词'
    return
  }
  const refImage = localImage.value || imageUrl.value.trim()
  if (mode.value === 'i2v' && !refImage) {
    error.value = '图生视频模式需要上传或提供参考图片'
    return
  }

  loading.value = true
  error.value = ''
  resultUrl.value = ''
  videoError.value = false
  progress.value = 0
  statusText.value = '正在创建视频任务...'

  try {
    const dur = getDurationConfig()
    const ratio = getRatioConfig()

    const task = await window.services.createVideoTask({
      prompt: prompt.value,
      negativePrompt: negativePrompt.value.trim() || null,
      image: mode.value === 'i2v' ? refImage : null,
      width: ratio.width,
      height: ratio.height,
      numFrames: dur.numFrames,
      frameRate: dur.frameRate,
      seed: seed.value.trim() ? parseInt(seed.value) : null
    })

    statusText.value = `任务已创建，正在生成视频... (${task.size || ''})`
    pollResult(task.videoId)
  } catch (err) {
    error.value = err.message
    loading.value = false
    statusText.value = ''
  }
}

const pollResult = (videoId, interval = 10000) => {
  pollTimer = setTimeout(async () => {
    try {
      const result = await window.services.getVideoResult(videoId)

      const doneStatuss = ['completed', 'succeeded', 'success', 'done', 'finished']
      const isDone = doneStatuss.includes(result.status) || (result.progress >= 100 && result.videoUrl)

      if (isDone && result.videoUrl) {
        progress.value = 100
        statusText.value = '视频生成完成！'

        const dur = getDurationConfig()
        const ratio = getRatioConfig()
        window.services?.saveHistory?.({
          id: `vid_${Date.now()}`,
          type: 'video',
          prompt: prompt.value,
          negativePrompt: negativePrompt.value.trim() || null,
          model: 'agnes-video-v2.0',
          params: {
            duration: duration.value,
            aspectRatio: aspectRatio.value,
            width: ratio.width,
            height: ratio.height,
            numFrames: dur.numFrames,
            frameRate: dur.frameRate,
            seed: seed.value || null,
            mode: mode.value
          },
          results: [{ url: result.videoUrl }],
          status: 'completed',
          createdAt: Date.now()
        })

        setTimeout(() => {
          resultUrl.value = result.videoUrl
          loading.value = false
        }, 600)
        return
      }

      if (result.status === 'failed' || result.status === 'error') {
        error.value = '视频生成失败，请重试'
        loading.value = false
        statusText.value = ''
        return
      }

      if (isDone && !result.videoUrl) {
        progress.value = 100
        statusText.value = '视频已生成，正在获取链接...'
        pollResult(videoId, 5000)
        return
      }

      progress.value = result.progress || 0
      statusText.value = `视频生成中... ${result.progress || 0}%`
      pollResult(videoId, 10000)
    } catch (err) {
      if (err.message && err.message.includes('rate limit')) {
        const next = Math.min(interval * 1.5, 60000)
        statusText.value = `查询频率受限，${Math.round(next / 1000)}秒后重试... ${progress.value || 0}%`
        pollResult(videoId, next)
      } else {
        error.value = err.message
        loading.value = false
        statusText.value = ''
      }
    }
  }, interval)
}

const download = async () => {
  if (!resultUrl.value) return
  try {
    const filePath = await window.services.downloadVideo(resultUrl.value)
    window.services.showInFolder(filePath)
    window.utools.showNotification('视频已保存')
  } catch (err) {
    window.utools.showNotification(`保存失败：${err.message}`)
  }
}

const copyUrl = () => {
  if (!resultUrl.value) return
  window.utools.copyText(resultUrl.value)
  window.utools.showNotification('链接已复制')
}

const onVideoError = () => {
  videoError.value = true
}

onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer)
})
</script>

<template>
  <div class="video-gen">
    <div class="mode-toggle">
      <button :class="{ active: mode === 't2v' }" @click="mode = 't2v'">文生视频</button>
      <button :class="{ active: mode === 'i2v' }" @click="mode = 'i2v'">图生视频</button>
    </div>

    <div class="card">
      <div class="form-group">
        <label>提示词</label>
        <textarea
          v-model="prompt"
          placeholder="描述你想要生成的视频内容，例如：一只金毛犬在日落时的海滩上奔跑"
          rows="3"
        ></textarea>
      </div>

      <div v-if="mode === 'i2v'" class="form-group">
        <label>参考图片</label>
        <div v-if="imagePreview" class="image-preview">
          <img :src="imagePreview" alt="预览" />
          <button class="btn-secondary clear-img-btn" @click="clearImage">移除</button>
        </div>
        <div v-else class="upload-area">
          <label class="upload-btn">
            <input type="file" accept="image/*" @change="onFileSelect" hidden />
            <span>点击上传本地图片</span>
          </label>
          <input type="text" v-model="imageUrl" placeholder="或输入图片 URL" @input="localImage = null; imagePreview = ''" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>视频时长</label>
          <select v-model="duration">
            <option v-for="d in durations" :key="d.value" :value="d.value">{{ d.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>分辨率</label>
          <select v-model="aspectRatio">
            <option v-for="r in ratios" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>随机种子（可选）</label>
        <input type="number" v-model="seed" placeholder="留空则随机" />
      </div>

      <div class="advanced-toggle" @click="showAdvanced = !showAdvanced">
        {{ showAdvanced ? '收起高级选项' : '展开高级选项' }}
      </div>

      <div v-if="showAdvanced" class="form-group">
        <label>负面提示词</label>
        <textarea
          v-model="negativePrompt"
          placeholder="不希望出现的内容，例如：模糊、抖动、变形"
          rows="2"
        ></textarea>
      </div>

      <button class="btn-primary" @click="generate" :disabled="loading">
        {{ loading ? '生成中...' : '生成视频' }}
      </button>
    </div>

    <div v-if="loading" class="loading-vertical">
      <div class="spinner"></div>
      <div class="status-text">{{ statusText }}</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="progress-text">{{ progress }}%</div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div v-if="!loading && !resultUrl && !error" class="empty-state">
      <div class="empty-icon">&#127916;</div>
      <div class="empty-text">输入提示词后点击生成视频</div>
    </div>

    <div v-if="resultUrl" class="result-area">
      <video v-if="!videoError" :src="resultUrl" controls autoplay loop @error="onVideoError"></video>
      <div v-if="videoError" class="video-fallback">
        <p>视频预览无法加载，可能是因为网络限制。</p>
        <a :href="resultUrl" target="_blank" rel="noopener">点击在新标签页中打开视频</a>
      </div>
      <div class="result-actions">
        <button @click="download">下载视频</button>
        <button class="btn-secondary" @click="copyUrl">复制链接</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-gen { max-width: 720px; }

.loading-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 20px;
}

.status-text {
  color: var(--text-secondary);
  font-size: 13px;
}

.progress-bar {
  width: 85%;
  max-width: 400px;
}

.progress-text {
  font-size: 14px;
  color: var(--primary);
  font-weight: 600;
}

.video-fallback {
  text-align: center;
  padding: 28px 16px;
  color: var(--text-secondary);
  background: var(--bg);
  border-radius: var(--radius-sm);
}
.video-fallback p { margin: 0 0 8px; font-size: 13px; }
.video-fallback a {
  color: var(--primary);
  font-weight: 500;
  text-decoration: none;
}
.video-fallback a:hover { text-decoration: underline; }

.advanced-toggle {
  color: var(--primary);
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 12px;
  user-select: none;
}
.advanced-toggle:hover { text-decoration: underline; }

.upload-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  transition: border-color 0.15s, color 0.15s;
}
.upload-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.image-preview {
  position: relative;
  display: inline-block;
}
.image-preview img {
  max-width: 100%;
  max-height: 200px;
  border-radius: var(--radius);
  display: block;
}
.clear-img-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 10px;
  font-size: 12px;
}
</style>
