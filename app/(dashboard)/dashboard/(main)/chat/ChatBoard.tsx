"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendAgentReply, toggleAiSession } from "./actions";

export interface ChatSession {
  id: string;
  phone: string;
  last_message: string;
  last_message_at: string;
  last_message_by: string;
  unread_count: number;
  ai_enabled: boolean;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  phone: string;
  direction: "inbound" | "outbound";
  content: string;
  sender: "customer" | "ai" | "agent" | "system";
  created_at: string;
}

export default function ChatBoard() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient());

  const fetchSessions = async () => {
    const { data, error } = await supabase.current
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });
    
    if (data && !error) {
      setSessions(data as ChatSession[]);
    }
    setLoadingSessions(false);
  };

  const fetchMessages = async (phone: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase.current
      .from("messages")
      .select("*")
      .eq("phone", phone)
      .order("created_at", { ascending: true });
      
    if (data && !error) {
      setMessages(data as ChatMessage[]);
    }
    setLoadingMessages(false);
    scrollToBottom();
  };

  useEffect(() => {
    fetchSessions();

    const channel = supabase.current.channel("pabbas-chat-live");
    channel.on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, () => {
      fetchSessions();
    });
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const newMsg = payload.new as ChatMessage;
      setMessages((prev) => {
        if (selectedPhone === newMsg.phone && !prev.some(m => m.id === newMsg.id)) {
          return [...prev, newMsg];
        }
        return prev;
      });
    });
    
    channel.subscribe();
    
    const poller = setInterval(() => {
      fetchSessions();
      if (selectedPhone) {
        supabase.current.from("messages").select("*").eq("phone", selectedPhone).order("created_at", { ascending: true })
          .then(({ data }) => {
            if (data) setMessages(data as ChatMessage[]);
          });
      }
    }, 5000);

    return () => {
      clearInterval(poller);
      supabase.current.removeChannel(channel);
    };
  }, [selectedPhone]);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
    } else {
      setMessages([]);
    }
  }, [selectedPhone]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPhone || !inputText.trim() || isSending) return;
    
    setIsSending(true);
    setSendError(null);
    const content = inputText.trim();
    
    const res = await sendAgentReply(selectedPhone, content);
    if (res.success) {
      setInputText("");
    } else {
      setSendError(res.error || "Failed to send message");
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as FormEvent);
    }
  };
  
  const handleToggleAi = async (phone: string, enabled: boolean) => {
    await toggleAiSession(phone, enabled);
  };

  const activeSession = sessions.find(s => s.phone === selectedPhone);

  const formatTime = (ts: string) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[600px] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
      <div className="w-[320px] flex-shrink-0 flex flex-col border-r border-[var(--line)] bg-[#FBFCFD]">
        <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-extrabold tracking-[-0.2px] text-[var(--ink)]">💬 Live Chat</h2>
            <span className="flex h-2 w-2 rounded-full bg-[var(--green)]"></span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <div className="p-4 text-sm text-[var(--muted)] text-center">Loading conversations...</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-sm text-[var(--muted)] text-center">No conversations yet</div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedPhone(session.phone)}
                  className={`w-full text-left p-4 hover:bg-white transition flex flex-col gap-1 ${
                    selectedPhone === session.phone ? "bg-white border-l-[3px] border-l-[var(--red)]" : "border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-[14px] text-[var(--ink)]">{session.phone}</span>
                    <span className="text-[11px] text-[var(--muted)]">{formatTime(session.updated_at)}</span>
                  </div>
                  <div className="text-[12.5px] text-[var(--muted)] truncate">
                    {session.last_message || "No messages"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#F8FAFB]">
        {selectedPhone ? (
          <>
            <div className="p-4 border-b border-[var(--line)] bg-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-[16px]">{selectedPhone}</h3>
                <div className="text-xs text-[var(--muted)] flex items-center gap-2 mt-0.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#E67E22]"></span>
                  <span>Staff online</span>
                </div>
              </div>
              <div>
                <button 
                  onClick={() => handleToggleAi(selectedPhone, !activeSession?.ai_enabled)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeSession?.ai_enabled 
                      ? "bg-[var(--tint)] text-[var(--red2)] border-[#F5C6CB] hover:bg-[#fce8e8]" 
                      : "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6] hover:bg-[#d6ebd9]"
                  }`}
                >
                  {activeSession?.ai_enabled ? "Take over / Disable AI" : "AI Disabled - Click to Enable"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="text-center text-sm text-[var(--muted)] mt-4">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-sm text-[var(--muted)] mt-4">No message history found.</div>
              ) : (
                messages.map((msg) => {
                  const isCustomer = msg.sender === "customer";
                  const isAi = msg.sender === "ai";
                  const isSystem = msg.sender === "system";

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <div className="bg-[#E9ECEF] text-[#495057] text-[11px] px-3 py-1 rounded-full font-medium">
                          {msg.content} - {formatTime(msg.created_at)}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"} mb-4`}>
                      <div className={`max-w-[70%] flex flex-col ${isCustomer ? "items-start" : "items-end"}`}>
                        <div className="text-[11px] font-bold text-[var(--muted)] mb-1 uppercase tracking-wide">
                          {isCustomer ? "Customer" : isAi ? "AI Assistant" : "Staff"}
                        </div>
                        <div 
                          className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                            isCustomer 
                              ? "bg-white text-[var(--ink)] rounded-tl-sm border border-[var(--line)]" 
                              : isAi
                                ? "bg-[var(--tint)] text-[var(--red2)] rounded-tr-sm border border-[#F5C6CB]"
                                : "bg-[var(--ink)] text-white rounded-tr-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className="text-[10px] text-[var(--muted)] mt-1 font-medium">
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-[var(--line)]">
              {sendError && (
                <div className="mb-2 text-xs font-semibold text-[var(--red2)]">
                  {sendError}
                </div>
              )}
              <form onSubmit={handleSend} className="flex flex-col gap-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  className="w-full h-[80px] resize-none rounded-xl border border-[var(--line)] p-3 text-sm focus:border-[var(--red)] focus:outline-none focus:ring-1 focus:ring-[var(--red)] disabled:opacity-50 disabled:bg-gray-50"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="bg-[var(--red)] hover:bg-[var(--red2)] text-white font-bold text-sm px-6 py-2 rounded-lg transition disabled:opacity-50 shadow-sm"
                  >
                    {isSending ? "Sending..." : "Reply as Pabbas Staff"}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-[var(--muted)]">
            <span className="text-4xl mb-3">💬</span>
            <p className="font-semibold text-lg">Pick a conversation</p>
            <p className="text-sm mt-1">Select a customer from the left to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
