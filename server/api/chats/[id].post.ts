import { z } from 'zod'
import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import type { UIMessage } from 'ai'

defineRouteMeta({
  openAPI: {
    description: 'Chat with DeepSeek.',
    tags: ['ai']
  }
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string()
  }).parse)

  const { model, messages } = await readValidatedBody(event, z.object({
    model: z.string(),
    messages: z.array(z.custom<UIMessage>())
  }).parse)

  const chat = await db.query.chats.findFirst({
    where: () => and(
      eq(schema.chats.id, id as string),
      eq(schema.chats.userId, session.user?.id || session.id)
    ),
    with: { messages: true }
  })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  // Générer un titre si le chat n'en a pas
  if (!chat.title && messages[0]) {
    const titleResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'system',
          content: 'Generate a short title (max 30 chars, no quotes, no punctuation) based on the user message.'
        }, {
          role: 'user',
          content: JSON.stringify(messages[0])
        }],
        max_tokens: 20
      })
    })

    if (titleResponse.ok) {
      const titleData = await titleResponse.json()
      const title = titleData.choices[0].message.content
      await db.update(schema.chats).set({ title }).where(eq(schema.chats.id, id as string))
    }
  }

  // Sauvegarder le message utilisateur
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === 'user' && messages.length > 1) {
    await db.insert(schema.messages).values({
      chatId: id as string,
      role: 'user',
      parts: lastMessage.parts
    })
  }

  // Préparer les messages pour DeepSeek
  const deepseekMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.parts?.map((p: any) => {
      if (p.text) return p.text
      if (p.url) return `[Image: ${p.url}]`
      return ''
    }).join(' ') || ''
  }))

  // Appel direct à DeepSeek
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant. The user's name is ${session.user?.username || 'there'}. Be concise, friendly, and helpful. Use markdown for formatting.`
        },
        ...deepseekMessages
      ],
      stream: true
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('DeepSeek API error:', error)
    throw createError({ statusCode: response.status, statusMessage: 'DeepSeek API error' })
  }

  // Streamer la réponse
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          const json = line.replace('data: ', '')
          if (json === '[DONE]') continue

          try {
            const parsed = JSON.parse(json)
            const content = parsed.choices[0]?.delta?.content
            if (content) {
              fullContent += content
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          } catch {}
        }
      }

      // Sauvegarder le message assistant
      if (fullContent) {
        await db.insert(schema.messages).values({
          chatId: id as string,
          role: 'assistant',
          parts: [{ type: 'text', text: fullContent }]
        })
      }

      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
})