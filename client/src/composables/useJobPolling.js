import { ref, onUnmounted } from 'vue'
import { getJob } from '../api.js'

export function useJobPolling() {
  const jobId = ref(null)
  const job = ref(null)
  const isProcessing = ref(false)
  const isDone = ref(false)
  const isError = ref(false)

  let pollTimer = null

  function start(id) {
    stop()
    jobId.value = id
    isProcessing.value = true
    isDone.value = false
    isError.value = false
    pollTimer = setInterval(async () => {
      try {
        const data = await getJob(jobId.value)
        job.value = data
        isProcessing.value = data.status !== 'done' && data.status !== 'error'
        isDone.value = data.status === 'done'
        isError.value = data.status === 'error'

        if (data.status === 'done' || data.status === 'error') stop()
      } catch {
        stop()
      }
    }, 2500)
  }

  function stop() {
    clearInterval(pollTimer)
    pollTimer = null
  }

  async function loadComplete(id) {
    stop()
    try {
      const data = await getJob(id)
      jobId.value = id
      job.value = data
      isProcessing.value = false
      isDone.value = data.status === 'done'
      isError.value = data.status === 'error'
    } catch {}
  }

  function reset() {
    stop()
    jobId.value = null
    job.value = null
    isProcessing.value = false
    isDone.value = false
    isError.value = false
  }

  onUnmounted(stop)

  return {
    job,
    jobId,
    isProcessing,
    isDone,
    isError,
    start,
    stop,
    loadComplete,
    reset,
  }
}
