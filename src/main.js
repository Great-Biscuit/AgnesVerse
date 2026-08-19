import { createApp } from "vue"
import "./main.css"
import "./dev-mock.js"
import App from "./App.vue"

const app = createApp(App)
app.config.errorHandler = (err) => {
  console.error('Vue error:', err)
}
app.mount("#app")
