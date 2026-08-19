<script lang="ts" setup>
import { ref } from 'vue'

const mode = ref('t2i')
const prompt = ref('')
const negativePrompt = ref('')
const imageUrl = ref('')
const localImage = ref(null)
const imagePreview = ref('')
const size = ref('1024x1024')
const model = ref('agnes-image-2.0-flash')
const seed = ref('')
const numImages = ref('1')
const loading = ref(false)
const results = ref([])
const error = ref('')
const showAdvanced = ref(false)

const sizes = [
  { label: '1K 方形 (1024×1024)', value: '1024x1024' },
  { label: '1K 横版 (1024×768)', value: '1024x768' },
  { label: '1K 竖版 (768×1024)', value: '768x1024' },
  { label: '1.5K 横版 (1536×1024)', value: '1536x1024' },
  { label: '1.5K 竖版 (1024×1536)', value: '1024x1536' },
  { label: '2K 方形 (2048×2048)', value: '2048x2048' },
  { label: '2K 横版 (2048×1536)', value: '2048x1536' },
  { label: '2K 竖版 (1536×2048)', value: '1536x2048' }
]

const models = (window.services?.getImageModels?.() || ['agnes-image-2.0-flash', 'agnes-image-2.1-flash']).map(m => ({
  label: m,
  value: m
}))

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
  if (mode.value === 'i2i' && !refImage) {
    error.value = '图生图模式需要上传或提供参考图片'
    return
  }

  loading.value = true
  error.value = ''
  results.value = []

  try {
    const n = parseInt(numImages.value) || 1
    const baseParams = {
      prompt: prompt.value,
      negativePrompt: negativePrompt.value.trim() || null,
      size: size.value,
      model: model.value,
      imageUrl: mode.value === 'i2i' ? refImage : null,
      responseFormat: 'url',
      seed: seed.value.trim() ? parseInt(seed.value) : null,
      n: 1
    }

    const requests = Array.from({ length: n }, () => window.services.generateImage(baseParams))
    const responses = await Promise.allSettled(requests)

    const items = []
    const errors = []
    for (const r of responses) {
      if (r.status === 'fulfilled') {
        const arr = Array.isArray(r.value) ? r.value : [r.value]
        items.push(...arr)
      } else {
        errors.push(r.reason?.message || '未知错误')
      }
    }

    if (items.length === 0) {
      throw new Error(errors[0] || '生成失败')
    }

    results.value = items.map(item => {
      if (item.url) return item.url
      if (item.b64_json) return `data:image/png;base64,${item.b64_json}`
      return null
    }).filter(Boolean)

    if (errors.length > 0 && items.length < n) {
      error.value = `${items.length}/${n} 张成功，${errors.length} 张失败：${errors[0]}`
    }

    window.services?.saveHistory?.({
      id: `img_${Date.now()}`,
      type: 'image',
      prompt: prompt.value,
      negativePrompt: negativePrompt.value.trim() || null,
      model: model.value,
      params: { size: size.value, seed: seed.value || null, n: numImages.value, mode: mode.value },
      results: items,
      status: 'completed',
      createdAt: Date.now()
    })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const download = async (url) => {
  try {
    if (url.startsWith('data:')) {
      const filePath = await window.services.saveBase64Image(url.split(',')[1], 'png')
      window.services.showInFolder(filePath)
    } else {
      const filePath = await window.services.downloadImage(url)
      window.services.showInFolder(filePath)
    }
    window.utools.showNotification('图片已保存')
  } catch (err) {
    window.utools.showNotification(`保存失败：${err.message}`)
  }
}

const copyUrl = (url) => {
  window.utools.copyText(url)
  window.utools.showNotification('链接已复制')
}
</script>

<template>
  <div class="image-gen">
    <div class="mode-toggle">
      <button :class="{ active: mode === 't2i' }" @click="mode = 't2i'">文生图</button>
      <button :class="{ active: mode === 'i2i' }" @click="mode = 'i2i'">图生图</button>
    </div>

    <div class="card">
      <div class="form-group">
        <label>提示词</label>
        <textarea
          v-model="prompt"
          placeholder="描述你想要生成的图片，例如：一只穿着宇航服的金毛犬在火星上散步"
          rows="3"
        ></textarea>
      </div>

      <div v-if="mode === 'i2i'" class="form-group">
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
          <label>分辨率</label>
          <select v-model="size">
            <option v-for="s in sizes" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>模型</label>
          <select v-model="model">
            <option v-for="m in models" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>生成数量</label>
          <select v-model="numImages">
            <option value="1">1 张</option>
            <option value="2">2 张</option>
            <option value="3">3 张</option>
            <option value="4">4 张</option>
          </select>
        </div>
        <div class="form-group">
          <label>随机种子（可选）</label>
          <input type="number" v-model="seed" placeholder="留空则随机" />
        </div>
      </div>

      <div class="advanced-toggle" @click="showAdvanced = !showAdvanced">
        {{ showAdvanced ? '收起高级选项' : '展开高级选项' }}
      </div>

      <div v-if="showAdvanced" class="form-group">
        <label>负面提示词</label>
        <textarea
          v-model="negativePrompt"
          placeholder="不希望出现的内容，例如：模糊、变形、多余的手指"
          rows="2"
        ></textarea>
      </div>

      <button class="btn-primary" @click="generate" :disabled="loading">
        {{ loading ? '生成中...' : '生成图片' }}
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>正在生成图片，请稍候...</span>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div v-if="!loading && results.length === 0 && !error" class="empty-state">
      <div class="empty-icon">&#128247;</div>
      <div class="empty-text">输入提示词后点击生成图片</div>
    </div>

    <div v-if="results.length > 0" class="result-area">
      <div class="result-grid">
        <div v-for="(url, i) in results" :key="i" class="result-item">
          <img :src="url" :alt="`生成结果 ${i + 1}`" />
          <div class="result-actions">
            <button @click="download(url)">下载</button>
            <button class="btn-secondary" @click="copyUrl(url)">复制链接</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-gen { max-width: 720px; }

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

.result-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
.result-item img {
  width: 100%;
  border-radius: var(--radius-sm);
}
.result-item .result-actions {
  margin-top: 10px;
}
</style>
