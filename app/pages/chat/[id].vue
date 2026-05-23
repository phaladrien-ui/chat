<script setup lang="ts">
import type { DefineComponent } from 'vue'
import type { UIMessage } from 'ai'
import { useClipboard } from '@vueuse/core'
import { getTextFromMessage } from '@nuxt/ui/utils/ai'
import ProseStreamPre from '../../components/prose/PreStream.vue'

const components = {
  pre: ProseStreamPre as unknown as DefineComponent
}

const route = useRoute()
const toast = useToast()
const clipboard = useClipboard()


function getFileName(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop() || 'file'
    return decodeURIComponent(filename)
  } catch {
    return 'file'
  }
}

const {
  dropzoneRef,
  isDragging,
  files,
  isUploading,
  uploadedFiles,
  addFiles,
  removeFile,
  clearFiles
} = useFileUploadWithStatus(route.params.id as string)

const { data } = await useFetch(`/api/chats/${route.params.id}`, {
  cache: 'force-cache'
})
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
}

const input = ref('')
const status = ref<'ready' | 'streaming' | 'error'>('ready')
const error = ref<string | null>(null)
const errorMessage = computed(() => error.value)

// Messages réactifs
const messages = ref<UIMessage[]>(data.value.messages || [])

async function handleSubmit(e: Event) {
  e.preventDefault()
  if (!input.value.trim() || isUploading.value) return

  const userMessage: UIMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    parts: [{ type: 'text', text: input.value }],
    createdAt: new Date()
  }

  messages.value.push(userMessage)
  input.value = ''
  clearFiles()
  status.value = 'streaming'
  error.value = null

  try {
    const response = await fetch(`/api/chats/${route.params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages.value
      })
    })

    if (!response.ok) {
      throw new Error('API error')
    }

    // Créer un message assistant vide
    const assistantMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
      createdAt: new Date()
    }
    messages.value.push(assistantMessage)

    // Lire le stream SSE
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

      for (const line of lines) {
        const json = line.replace('data: ', '')
        if (json === '[DONE]') continue

        try {
          const parsed = JSON.parse(json)
          if (parsed.content) {
            // Ajouter le texte au dernier message (assistant)
            const lastPart = assistantMessage.parts[0]
            if (lastPart && lastPart.type === 'text') {
              lastPart.text += parsed.content
            }
          }
        } catch {}
      }
    }

    status.value = 'ready'
    refreshNuxtData('chats')
  } catch (err) {
    status.value = 'error'
    error.value = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      description: error.value,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 0
    })
  }
}

function stop() {
  status.value = 'ready'
}

function regenerate() {
  // Enlever le dernier message assistant et renvoyer
  if (messages.value.length > 1 && messages.value[messages.value.length - 1].role === 'assistant') {
    messages.value.pop()
  }
  // Relancer avec le dernier message utilisateur
  const lastUserMessage = [...messages.value].reverse().find(m => m.role === 'user')
  if (lastUserMessage) {
    input.value = lastUserMessage.parts[0]?.type === 'text' ? lastUserMessage.parts[0].text : ''
    handleSubmit(new Event('submit'))
  }
}

const copied = ref(false)

function copy(e: MouseEvent, message: UIMessage) {
  clipboard.copy(getTextFromMessage(message))
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

onMounted(() => {
  if (data.value?.messages.length === 1) {
    regenerate()
  }
})
</script>

<template>
  <UDashboardPanel id="chat" class="relative" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <DashboardNavbar />
    </template>

    <template #body>
      <DragDropOverlay :show="isDragging" />
      <UContainer ref="dropzoneRef" class="flex-1 flex flex-col gap-4 sm:gap-6">
        <UChatMessages
          should-auto-scroll
          :messages="messages"
          :status="status"
          :assistant="status !== 'streaming' ? { actions: [{ label: 'Copy', icon: copied ? 'i-lucide-copy-check' : 'i-lucide-copy', onClick: copy }] } : { actions: [] }"
          :spacing-offset="160"
          class="lg:pt-(--ui-header-height) pb-4 sm:pb-6"
        >
          <template #content="{ message }">
            <template v-for="(part, index) in (message.parts || [])" :key="`${message.id}-${part.type}-${index}`">
              <MDCCached
                v-if="part.type === 'text'"
                :value="part.text"
                :cache-key="`${message.id}-${index}`"
                :components="components"
                :parser-options="{ highlight: false }"
                class="*:first:mt-0 *:last:mb-0"
              />
              <FileAvatar
                v-else-if="part.type === 'file'"
                :name="getFileName(part.url)"
                :type="part.mediaType"
                :preview-url="part.url"
              />
            </template>
          </template>
        </UChatMessages>

        <UChatPrompt
          v-model="input"
          :error="errorMessage"
          :disabled="isUploading"
          variant="subtle"
          class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
          :ui="{ base: 'px-1.5' }"
          @submit="handleSubmit"
        >
          <template v-if="files.length > 0" #header>
            <div class="flex flex-wrap gap-2">
              <FileAvatar
                v-for="fileWithStatus in files"
                :key="fileWithStatus.id"
                :name="fileWithStatus.file.name"
                :type="fileWithStatus.file.type"
                :preview-url="fileWithStatus.previewUrl"
                :status="fileWithStatus.status"
                :error="fileWithStatus.error"
                removable
                @remove="removeFile(fileWithStatus.id)"
              />
            </div>
          </template>

          <template #footer>
            <div class="flex items-center gap-1">
              
            </div>

            <UChatPromptSubmit
              :status="status"
              :disabled="isUploading"
              color="neutral"
              size="sm"
              @stop="stop()"
              @reload="regenerate()"
            />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>