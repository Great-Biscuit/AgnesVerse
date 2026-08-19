const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')

const API_HOST = 'apihub.agnes-ai.com'

function request(method, urlPath, apiKey, body) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json'
    }
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    const payload = body ? JSON.stringify(body) : null
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload)
    }

    const options = {
      hostname: API_HOST,
      path: urlPath,
      method,
      headers
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        let parsed
        try {
          parsed = JSON.parse(data)
        } catch {
          parsed = data
        }
        resolve({ statusCode: res.statusCode, data: parsed })
      })
    })

    req.on('error', reject)
    req.setTimeout(300000, () => {
      req.destroy(new Error('请求超时，请检查网络连接'))
    })
    if (payload) req.write(payload)
    req.end()
  })
}

function downloadFile(url, ext) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(window.utools.getPath('downloads'), `${Date.now()}.${ext}`)
    const file = fs.createWriteStream(filePath)

    const handleRedirect = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          handleRedirect(res.headers.location)
          return
        }
        res.pipe(file)
        file.on('finish', () => {
          file.close(() => resolve(filePath))
        })
        file.on('error', (err) => {
          fs.unlink(filePath, () => {})
          reject(err)
        })
      }).on('error', (err) => {
        fs.unlink(filePath, () => {})
        reject(err)
      })
    }

    handleRedirect(url)
  })
}

const IMAGE_MODELS = ['agnes-image-2.0-flash', 'agnes-image-2.1-flash']

window.services = {
  getApiKey() {
    return window.utools.dbStorage.getItem('agnes_api_key') || ''
  },

  saveApiKey(key) {
    window.utools.dbStorage.setItem('agnes_api_key', key)
    return this.getApiKey() === key
  },

  hasApiKey() {
    return !!this.getApiKey()
  },

  async generateImage({ prompt, size, model, imageUrl, responseFormat, negativePrompt, seed, n }) {
    const apiKey = this.getApiKey()
    if (!apiKey) throw new Error('请先在设置中配置 API Key')

    const body = {
      model: model || 'agnes-image-2.0-flash',
      prompt,
      size: size || '1024x1024',
      n: n || 1,
      extra_body: {
        response_format: responseFormat || 'url'
      }
    }
    if (imageUrl) {
      body.extra_body.image = [imageUrl]
    }
    if (negativePrompt) {
      body.extra_body.negative_prompt = negativePrompt
    }
    if (seed !== null && seed !== undefined && !isNaN(seed)) {
      body.extra_body.seed = seed
    }

    const res = await request('POST', '/v1/images/generations', apiKey, body)
    if (res.statusCode !== 200) {
      const msg = res.data?.error?.message || res.data?.message || `请求失败 (HTTP ${res.statusCode})`
      throw new Error(msg)
    }
    const items = res.data?.data || []
    if (items.length === 0) throw new Error('返回数据格式异常')
    return items.map(item => ({
      url: item.url || null,
      b64_json: item.b64_json || null
    }))
  },

  async createVideoTask({ prompt, image, width, height, numFrames, frameRate, mode, negativePrompt, seed }) {
    const apiKey = this.getApiKey()
    if (!apiKey) throw new Error('请先在设置中配置 API Key')

    const body = {
      model: 'agnes-video-v2.0',
      prompt,
      width: width || 1152,
      height: height || 768,
      num_frames: numFrames || 121,
      frame_rate: frameRate || 24
    }
    if (image) body.image = image
    if (mode) body.mode = mode
    if (negativePrompt) body.negative_prompt = negativePrompt
    if (seed !== null && seed !== undefined && !isNaN(seed)) body.seed = seed

    const res = await request('POST', '/v1/videos', apiKey, body)
    if (res.statusCode !== 200) {
      const msg = res.data?.error?.message || res.data?.message || `请求失败 (HTTP ${res.statusCode})`
      throw new Error(msg)
    }
    return {
      taskId: res.data.id || res.data.task_id,
      videoId: res.data.video_id,
      status: res.data.status,
      progress: res.data.progress || 0,
      size: res.data.size,
      seconds: res.data.seconds
    }
  },

  async getVideoResult(videoId) {
    const apiKey = this.getApiKey()
    const res = await request('GET', `/agnesapi?video_id=${videoId}`, apiKey, null)
    if (res.statusCode !== 200) {
      const msg = res.data?.error?.message || res.data?.message || `请求失败 (HTTP ${res.statusCode})`
      throw new Error(msg)
    }
    const d = res.data
    const videoUrl =
      d.metadata?.url ||
      d.video_url ||
      d.url ||
      d.output_url ||
      d.result_url ||
      d.output?.[0]?.url ||
      null
    const status = (d.status || '').toLowerCase()
    return {
      taskId: d.id || d.task_id,
      videoId: d.video_id,
      status,
      progress: d.progress || 0,
      size: d.size,
      seconds: d.seconds,
      videoUrl,
      raw: d,
      completedAt: d.completed_at || null
    }
  },

  async downloadImage(url) {
    return downloadFile(url, 'png')
  },

  async downloadVideo(url) {
    return downloadFile(url, 'mp4')
  },

  async saveBase64Image(b64Data, ext) {
    ext = ext || 'png'
    const filePath = path.join(window.utools.getPath('downloads'), `${Date.now()}.${ext}`)
    fs.writeFileSync(filePath, b64Data, { encoding: 'base64' })
    return filePath
  },

  openExternal(url) {
    window.utools.shellOpenExternal(url)
  },

  showInFolder(filePath) {
    window.utools.shellShowItemInFolder(filePath)
  },

  getImageModels() {
    return IMAGE_MODELS
  },

  saveHistory(record) {
    const list = this._getHistoryList()
    list.unshift(record)
    if (list.length > 200) list.length = 200
    window.utools.dbStorage.setItem('agnes_history', JSON.stringify(list))
    return record
  },

  getHistory(filter = {}) {
    let list = this._getHistoryList()
    if (filter.type) {
      list = list.filter(r => r.type === filter.type)
    }
    const limit = filter.limit || 100
    return list.slice(0, limit)
  },

  deleteHistory(id) {
    const list = this._getHistoryList()
    const filtered = list.filter(r => r.id !== id)
    window.utools.dbStorage.setItem('agnes_history', JSON.stringify(filtered))
    return filtered.length < list.length
  },

  clearHistory() {
    window.utools.dbStorage.setItem('agnes_history', '[]')
  },

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
    } catch {
      return []
    }
  }
}
