"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { UserAvatar } from "@/components/cinema/user-avatar";

interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  userId: string;
  username: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
}

export function MessagesView({ targetUsername }: { targetUsername?: string }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fallback redirect if not logged in
  useEffect(() => {
    if (user === null) {
      navigate("/login");
    }
  }, [user, navigate]);

  const conversations = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/api/messages/conversations").then((r) => r.data!),
    enabled: !!user,
  });

  const activeTarget = useQuery<{ id: string; username: string; avatar: string | null }>({
    queryKey: ["user", targetUsername],
    queryFn: () => api.get(`/api/users/${targetUsername}`).then((r) => r.data!),
    enabled: !!targetUsername,
  });

  const messages = useQuery<DirectMessage[]>({
    queryKey: ["messages", activeTarget.data?.id],
    queryFn: () => api.get<DirectMessage[]>(`/api/messages/${activeTarget.data!.id}`).then((r) => r.data!),
    enabled: !!activeTarget.data?.id,
  });

  // Socket connection for real-time DMs
  useEffect(() => {
    if (!user) return;
    const sock = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    setSocket(sock);

    sock.emit("user:register", { userId: user.id });

    sock.on("dm:receive", (data: DirectMessage) => {
      // Invalidate both current chat and conversations list
      qc.invalidateQueries({ queryKey: ["messages", data.senderId] });
      qc.invalidateQueries({ queryKey: ["messages", data.receiverId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });

    return () => {
      sock.disconnect();
    };
  }, [user, qc]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.data]);

  const sendMessage = useMutation({
    mutationFn: () =>
      api.post<{ msg: DirectMessage }>("/api/messages", {
        receiverId: activeTarget.data!.id,
        content: input.trim(),
      }),
    onSuccess: (res) => {
      setInput("");
      // Emit to socket for realtime delivery
      socket?.emit("dm:send", {
        targetUserId: activeTarget.data!.id,
        message: res.data!.msg,
      });
      qc.invalidateQueries({ queryKey: ["messages", activeTarget.data!.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex gap-6">
      {/* Conversations List */}
      <Card className="w-1/3 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Messages</h2>
        </div>
        <ScrollArea className="flex-1">
          {conversations.isLoading ? (
            <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : conversations.data?.length ? (
            <div className="divide-y divide-border">
              {conversations.data.map((c) => (
                <button
                  key={c.userId}
                  onClick={() => navigate(`/messages/${c.username}`)}
                  className={`w-full flex items-center gap-3 p-4 text-start hover:bg-accent transition-colors ${
                    targetUsername === c.username ? "bg-accent/50" : ""
                  }`}
                >
                  <UserAvatar username={c.username} avatar={c.avatar} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
              <MessageSquare className="size-8 mb-2 opacity-50" />
              <p>No conversations yet.</p>
              <p className="text-xs mt-1">Visit a user's profile to send them a message.</p>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {targetUsername && activeTarget.data ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center gap-3 bg-card/50">
              <UserAvatar username={activeTarget.data.username} avatar={activeTarget.data.avatar} size={40} />
              <div>
                <h3 className="font-semibold">{activeTarget.data.username}</h3>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" ref={scrollRef}>
              {messages.isLoading ? (
                <div className="flex justify-center flex-1 items-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : messages.data?.length ? (
                messages.data.map((msg) => {
                  const isMe = msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={`flex max-w-[70%] ${isMe ? "ms-auto" : "me-auto"}`}>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isMe
                            ? "bg-red-600 text-white rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMe ? "text-red-200" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  Send a message to start the conversation
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-card/50 border-t border-border flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !sendMessage.isPending) sendMessage.mutate();
                  }
                }}
                placeholder="Type your message..."
                className="bg-card"
              />
              <Button
                size="icon"
                onClick={() => sendMessage.mutate()}
                disabled={!input.trim() || sendMessage.isPending}
                className="bg-red-600 hover:bg-red-700 shrink-0"
              >
                {sendMessage.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="size-16 mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </Card>
    </div>
  );
}