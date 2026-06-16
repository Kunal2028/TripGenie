import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatCircleDots, HandWaving, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { sendChatMessage } from "@/lib/api";

export default function Chatbot() {
  const { signedIn, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "May I help? Ask a question about your trip." },
  ]);
  const firstName = (user?.name || user?.email?.split("@")[0] || "there")
    .trim()
    .split(/\s+/)[0];
  const greetingName = firstName
    ? firstName.charAt(0).toUpperCase() + firstName.slice(1)
    : "there";

  useEffect(() => {
    if (!signedIn) return;
    const timer = setTimeout(() => {
      setShowGreeting(true);
    }, 900);
    return () => clearTimeout(timer);
  }, [signedIn]);

  if (!signedIn) return null;

  const onSend = async (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || loading) return;
    setMessage("");
    setMessages((items) => [...items, { role: "user", text }]);
    setLoading(true);
    try {
      const data = await sendChatMessage(text);
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: data.reply || "I could not answer that.",
          structured: data.structured,
        },
      ]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Chat failed");
      setMessages((items) => [...items, { role: "assistant", text: "Sorry, I could not answer right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50" data-testid="chatbot">
      <AnimatePresence>
        {!open && showGreeting && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="mb-3 mr-1 w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border border-[#e5e4e2] bg-white p-3 shadow-[0_18px_50px_rgba(26,47,36,0.14)]"
            data-testid="chatbot-greeting"
          >
            <div className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-visible">
                <HumanAvatar />
                <motion.span
                  initial={{ rotate: -8, scale: 0.92 }}
                  animate={{ rotate: [-8, 18, -12, 18, -4], scale: [0.92, 1, 1, 1, 0.96] }}
                  transition={{ duration: 1.25, delay: 0.3, repeat: 2, repeatDelay: 1.2 }}
                  className="absolute -right-2 -top-1 grid h-7 w-7 origin-bottom-left place-items-center rounded-full bg-[#E27D60] text-white shadow-[0_8px_20px_rgba(226,125,96,0.28)] ring-2 ring-white"
                  aria-hidden="true"
                >
                  <HandWaving size={16} weight="fill" />
                </motion.span>
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold text-[#1A2F24]">
                  Hey {greetingName}, I am your trip helper.
                </div>
                <p className="mt-1 text-sm leading-snug text-[#5C6B62]">
                  Feel free to ask for travel tips, budget help, packing ideas, or local questions.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(true);
                    setShowGreeting(false);
                  }}
                  className="mt-3 text-sm font-medium text-[#E27D60] hover:text-[#C86B50]"
                  data-testid="chatbot-greeting-action"
                >
                  Ask a question
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowGreeting(false)}
                className="h-7 w-7 shrink-0 rounded-full grid place-items-center text-[#5C6B62] hover:bg-[#f9f8f6]"
                aria-label="Dismiss greeting"
                data-testid="chatbot-greeting-dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="mb-3 w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border border-[#e5e4e2] bg-white shadow-[0_24px_70px_rgba(26,47,36,0.18)] overflow-hidden"
        >
          <div className="flex items-center justify-between bg-[#1A2F24] px-4 py-3 text-white">
            <div>
              <div className="font-display font-medium">TripGenie chat</div>
              <div className="text-xs text-white/70">Ask a question</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full grid place-items-center hover:bg-white/10"
              aria-label="Close chat"
              data-testid="chatbot-close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="h-80 overflow-y-auto bg-[#f9f8f6] p-4 space-y-3">
            {messages.map((item, i) => (
              <div
                key={i}
                data-testid={`chat-message-${i}`}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  item.role === "user"
                    ? "ml-auto bg-[#E27D60] text-white"
                    : "bg-white text-[#1A2F24] border border-[#e5e4e2]"
                }`}
              >
                {item.structured ? <StructuredReply data={item.structured} /> : item.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-2xl bg-white border border-[#e5e4e2] px-4 py-2.5 text-sm text-[#5C6B62]">
                Thinking...
              </div>
            )}
          </div>

          <form onSubmit={onSend} className="flex gap-2 border-t border-[#e5e4e2] bg-white p-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question..."
              data-testid="chatbot-input"
              className="!py-2.5"
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              data-testid="chatbot-send"
              className="w-11 h-11 rounded-full bg-[#E27D60] text-white grid place-items-center disabled:opacity-50 shrink-0"
              aria-label="Send message"
            >
              <PaperPlaneTilt size={18} weight="bold" />
            </button>
          </form>
        </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setShowGreeting(false);
        }}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1A2F24] text-white shadow-[0_18px_45px_rgba(26,47,36,0.25)] hover:bg-[#253d31]"
        data-testid="chatbot-toggle"
        aria-label="Open chat"
      >
        <ChatCircleDots size={26} weight="duotone" />
      </button>
    </div>
  );
}

function HumanAvatar() {
  return (
    <div className="relative h-16 w-16 rounded-full bg-[#f0f5f2] shadow-inner ring-2 ring-white">
      <div className="absolute inset-x-2 top-1 h-7 rounded-t-full bg-[#1A2F24]" />
      <div className="absolute left-2 top-5 h-10 w-12 rounded-full bg-[#F1C7A8] shadow-[inset_0_-8px_0_rgba(226,125,96,0.16)]">
        <div className="absolute left-3 top-4 h-1.5 w-1.5 rounded-full bg-[#1A2F24]" />
        <div className="absolute right-3 top-4 h-1.5 w-1.5 rounded-full bg-[#1A2F24]" />
        <div className="absolute left-1/2 top-6 h-2 w-5 -translate-x-1/2 rounded-b-full border-b-2 border-[#1A2F24]" />
      </div>
      <div className="absolute left-0 top-7 h-3 w-3 rounded-full bg-[#F1C7A8]" />
      <div className="absolute right-0 top-7 h-3 w-3 rounded-full bg-[#F1C7A8]" />
      <div className="absolute bottom-1 left-1/2 h-4 w-8 -translate-x-1/2 rounded-t-full bg-[#85B09A]" />
    </div>
  );
}

function StructuredReply({ data }) {
  return (
    <div className="space-y-3">
      {data.title && (
        <div className="font-display font-semibold text-base text-[#1A2F24]">
          {data.title}
        </div>
      )}
      {data.summary && <p>{data.summary}</p>}
      {data.bullets?.length > 0 && (
        <ul className="space-y-1.5">
          {data.bullets.slice(0, 5).map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#E27D60] shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {data.next_steps?.length > 0 && (
        <div>
          <div className="label-eyebrow mb-1">next steps</div>
          <ol className="space-y-1.5">
            {data.next_steps.slice(0, 4).map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold text-[#85B09A]">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {data.note && (
        <div className="rounded-xl bg-[#f9f8f6] px-3 py-2 text-xs text-[#5C6B62]">
          {data.note}
        </div>
      )}
    </div>
  );
}
