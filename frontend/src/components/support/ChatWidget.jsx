import { useState, useRef, useEffect } from 'react'
import api from '../../services/api'

const GREETING = {
  role: 'assistant',
  content: "Hi! 👋 I'm the BounceTrap assistant. Ask me anything about email verification, pricing, credits or how a feature works. You can also switch to “Contact us” to message our team.",
}

function ChatTab({ messages, setMessages }) {
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const { data } = await api.post('/support/chat/', { messages: next.filter(m => m.role !== 'system') })
      setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages([...next, { role: 'assistant', content: "Sorry, I couldn't respond just now. Please try again or use the Contact us tab." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-brand-600 text-white rounded-br-md'
                : 'bg-white/[0.06] text-slate-200 rounded-bl-md'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.06] px-4 py-3 rounded-2xl rounded-bl-md">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-white/8 p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white transition-colors"
          aria-label="Send"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  )
}

function ContactTab() {
  const [form, setForm]       = useState({ name: '', email: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.message.trim()) return
    setSending(true); setError('')
    try {
      await api.post('/support/contact/', form)
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">Message sent!</p>
        <p className="text-slate-400 text-sm">We've received your message and will reply by email soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col h-full px-4 py-4 gap-3 overflow-y-auto">
      <p className="text-slate-400 text-sm">Send us a message and we'll reply by email.</p>
      <input
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Your name (optional)"
        className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
      />
      <input
        type="email"
        required
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        placeholder="Your email *"
        className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
      />
      <textarea
        required
        rows={5}
        value={form.message}
        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
        placeholder="How can we help? *"
        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 resize-none"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={sending || !form.email.trim() || !form.message.trim()}
        className="py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
      >
        {sending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}

export default function ChatWidget() {
  const [open, setOpen]       = useState(false)
  const [tab, setTab]         = useState('chat')
  const [messages, setMessages] = useState([GREETING])

  return (
    <>
      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-[calc(100vw-2.5rem)] sm:w-96 h-[32rem] max-h-[calc(100vh-8rem)] rounded-2xl border border-white/10 bg-[#0e0e1c] shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/8 bg-gradient-to-r from-brand-950/60 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src="/favicon.svg" alt="BounceTrap" className="w-6 h-6" />
                <div>
                  <p className="text-white font-semibold text-sm leading-none">BounceTrap Support</p>
                  <p className="text-emerald-400 text-[11px] mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 mt-3 bg-white/[0.04] rounded-lg p-1">
              <button
                onClick={() => setTab('chat')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab === 'chat' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Ask AI
              </button>
              <button
                onClick={() => setTab('contact')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab === 'contact' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Contact us
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0">
            {tab === 'chat'
              ? <ChatTab messages={messages} setMessages={setMessages} />
              : <ContactTab />}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/40 flex items-center justify-center transition-all hover:scale-105"
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83l-5 1.83 1.83-5A9.86 9.86 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
    </>
  )
}
