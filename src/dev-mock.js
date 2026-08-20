if (!window.utools) {
  const DEFAULT_API_KEY = 'sk-xxx'
  let mockApiKey = DEFAULT_API_KEY

  window.utools = {
    onPluginEnter(cb) {
      cb({ code: 'image', type: 'text', payload: '' })
    },
    onPluginOut(cb) {},
    dbStorage: {
      getItem(key) {
        if (key === 'agnes_api_key') return mockApiKey
        return localStorage.getItem(key) || null
      },
      setItem(key, value) {
        if (key === 'agnes_api_key') { mockApiKey = value; return }
        localStorage.setItem(key, value)
      }
    },
    getPath(name) { return name === 'downloads' ? 'C:/Users/Downloads' : '' },
    showNotification(msg) { console.log('[notification]', msg) },
    shellOpenExternal(url) { window.open(url, '_blank') },
    shellShowItemInFolder() {},
    copyText(text) { navigator.clipboard?.writeText(text) },
    showOpenDialog() { return null }
  }
}

if (!window.services) {
  const API_BASE = '/agnes-api'

  window.services = {
    getApiKey() { return window.utools.dbStorage.getItem('agnes_api_key') || '' },
    saveApiKey(key) { window.utools.dbStorage.setItem('agnes_api_key', key); return true },
    hasApiKey() { return !!this.getApiKey() },
    getImageModels() { return ['agnes-image-2.0-flash', 'agnes-image-2.1-flash'] },

    async generateImage({ prompt, size, model, imageUrl, responseFormat, negativePrompt, seed, n }) {
      const apiKey = this.getApiKey()
      if (!apiKey) throw new Error('请先配置 API Key')

      const body = {
        model: model || 'agnes-image-2.0-flash',
        prompt,
        size: size || '1024x1024',
        n: n || 1,
        extra_body: { response_format: responseFormat || 'url' }
      }
      if (imageUrl) body.extra_body.image = [imageUrl]
      if (negativePrompt) body.extra_body.negative_prompt = negativePrompt
      if (seed !== null && seed !== undefined && !isNaN(seed)) body.extra_body.seed = seed

      const res = await fetch(`${API_BASE}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `请求失败 (HTTP ${res.status})`)
      }

      const items = data.data || []
      if (items.length === 0) throw new Error('返回数据格式异常')
      return items.map(item => ({
        url: item.url || null,
        b64_json: item.b64_json || null
      }))
    },

    async createVideoTask({ prompt, image, width, height, numFrames, frameRate, negativePrompt, seed }) {
      const apiKey = this.getApiKey()
      if (!apiKey) throw new Error('请先配置 API Key')

      const body = {
        model: 'agnes-video-v2.0',
        prompt,
        width: width || 1152,
        height: height || 768,
        num_frames: numFrames || 121,
        frame_rate: frameRate || 24
      }
      if (image) body.image = image
      if (negativePrompt) body.negative_prompt = negativePrompt
      if (seed !== null && seed !== undefined && !isNaN(seed)) body.seed = seed

      const res = await fetch(`${API_BASE}/v1/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `请求失败 (HTTP ${res.status})`)
      }

      return {
        taskId: data.id || data.task_id,
        videoId: data.video_id,
        status: data.status,
        progress: data.progress || 0,
        size: data.size,
        seconds: data.seconds
      }
    },

    async getVideoResult(videoId) {
      const apiKey = this.getApiKey()

      const res = await fetch(`${API_BASE}/agnesapi?video_id=${videoId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `请求失败 (HTTP ${res.status})`)
      }

      const videoUrl =
        data.metadata?.url ||
        data.video_url ||
        data.url ||
        data.output_url ||
        data.result_url ||
        data.output?.[0]?.url ||
        null
      const status = (data.status || '').toLowerCase()
      return {
        taskId: data.id || data.task_id,
        videoId: data.video_id,
        status,
        progress: data.progress || 0,
        size: data.size,
        seconds: data.seconds,
        videoUrl,
        raw: data,
        completedAt: data.completed_at || null
      }
    },

    async downloadImage(url) {
      const a = document.createElement('a')
      a.href = url
      a.download = `agnes-image-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      return 'downloaded'
    },

    async downloadVideo(url) {
      const a = document.createElement('a')
      a.href = url
      a.download = `agnes-video-${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      return 'downloaded'
    },

    async saveBase64Image(b64, ext) {
      const a = document.createElement('a')
      a.href = `data:image/${ext || 'png'};base64,${b64}`
      a.download = `agnes-image-${Date.now()}.${ext || 'png'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      return 'downloaded'
    },

    openExternal(url) { window.utools.shellOpenExternal(url) },
    showInFolder() { console.log('[dev] showInFolder') },

    saveHistory(record) {
      const list = this._getHistoryList()
      list.unshift(record)
      if (list.length > 200) list.length = 200
      window.utools.dbStorage.setItem('agnes_history', JSON.stringify(list))
      return record
    },
    getHistory(filter = {}) {
      let list = this._getHistoryList()
      if (filter.type) list = list.filter(r => r.type === filter.type)
      return list.slice(0, filter.limit || 100)
    },
    deleteHistory(id) {
      const list = this._getHistoryList()
      const filtered = list.filter(r => r.id !== id)
      window.utools.dbStorage.setItem('agnes_history', JSON.stringify(filtered))
      return filtered.length < list.length
    },
    clearHistory() { window.utools.dbStorage.setItem('agnes_history', '[]') },
    getHistoryStats() {
      const list = this._getHistoryList()
      return {
        total: list.length,
        images: list.filter(r => r.type === 'image').length,
        videos: list.filter(r => r.type === 'video').length
      }
    },
    _getHistoryList() {
      try {
        const raw = window.utools.dbStorage.getItem('agnes_history')
        return raw ? JSON.parse(raw) : []
      } catch { return [] }
    }
  }
}
