import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

interface RoomMember {
  userId: string;
  username: string;
  isHost: boolean;
  avatar?: string | null;
  isVideoChat?: boolean;
  isMuted?: boolean;
}

interface VideoChatProps {
  socket: Socket | null;
  members: RoomMember[];
  hostId: string;
  className?: string;
}

const iceServers = () => {
  return [{ urls: "stun:stun.l.google.com:19302" }];
};

export const VideoChat: React.FC<VideoChatProps> = ({ socket, members, hostId, className }) => {
  const { user } = useAuthStore();
  const selfId = user?.id;

  const [inVideoChat, setInVideoChat] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  const ourStreamRef = useRef<MediaStream | null>(null);
  const videoPCsRef = useRef<Record<string, RTCPeerConnection>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});

  useEffect(() => {
    if (!socket) return;

    const handleSignal = async (data: any) => {
      const msg = data.msg;
      const from = data.from;
      let pc = videoPCsRef.current[from];
      if (!pc) return;

      if (msg.ice !== undefined) {
        pc.addIceCandidate(new RTCIceCandidate(msg.ice)).catch(console.error);
      } else if (msg.sdp && msg.sdp.type === "offer") {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          pc.close();
          delete videoPCsRef.current[from];
          updateWebRTC();
          pc = videoPCsRef.current[from];
          if (!pc) return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(from, { sdp: pc.localDescription });
      } else if (msg.sdp && msg.sdp.type === "answer") {
        pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).catch(console.error);
      }
    };

    socket.on("signal", handleSignal);
    return () => {
      socket.off("signal", handleSignal);
    };
  }, [socket]);

  useEffect(() => {
    updateWebRTC();
  }, [members, inVideoChat]);

  useEffect(() => {
    return () => {
      stopWebRTC();
    };
  }, []);

  const sendSignal = async (to: string, data: any) => {
    if (!socket) return;
    socket.emit("signal", { to, msg: data });
  };

  const emitUserMute = (isMuted: boolean) => {
    if (!socket) return;
    socket.emit("CMD:userMute", { isMuted });
  };

  const setupWebRTC = async () => {
    if (!socket) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
    } catch (e) {
      console.warn("Failed to get video+audio, trying audio only", e);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setIsVideoEnabled(false);
        setIsAudioEnabled(true);
      } catch (e2) {
        console.error("Failed to get any media devices", e2);
        let canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        let ctx = canvas.getContext("2d");
        if (ctx) ctx.fillRect(0, 0, 640, 480);
        stream = canvas.captureStream();
        let track = stream.getVideoTracks()[0];
        if (track) track.enabled = false;
      }
    }

    ourStreamRef.current = stream;
    setInVideoChat(true);
    socket.emit("CMD:joinVideo");
    emitUserMute(!stream.getAudioTracks().some(t => t.enabled));

    setTimeout(() => {
      if (selfId && videoRefs.current[selfId] && ourStreamRef.current) {
        videoRefs.current[selfId].srcObject = ourStreamRef.current;
      }
    }, 100);
  };

  const stopWebRTC = () => {
    if (ourStreamRef.current) {
      ourStreamRef.current.getTracks().forEach((track) => track.stop());
      ourStreamRef.current = null;
    }

    Object.keys(videoPCsRef.current).forEach((key) => {
      videoPCsRef.current[key].close();
      delete videoPCsRef.current[key];
    });

    setInVideoChat(false);
    setIsVideoEnabled(false);
    setIsAudioEnabled(false);

    if (socket) {
      socket.emit("CMD:leaveVideo");
    }
  };

  const toggleVideo = () => {
    if (ourStreamRef.current) {
      const videoTrack = ourStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (ourStreamRef.current) {
      const audioTrack = ourStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        emitUserMute(!audioTrack.enabled);
      }
    }
  };

  const updateWebRTC = () => {
    if (!ourStreamRef.current || !selfId) return;

    const videoPCs = videoPCsRef.current;

    const clientIds = new Set(
      members.filter((p) => p.isVideoChat).map((p) => p.userId)
    );

    Object.keys(videoPCs).forEach((key) => {
      if (!clientIds.has(key) && key !== selfId) {
        videoPCs[key].close();
        delete videoPCs[key];

        if (videoRefs.current[key]) {
          videoRefs.current[key].srcObject = null;
        }
      }
    });

    members.forEach((user) => {
      const id = user.userId;

      if (!user.isVideoChat) return;

      if (id === selfId) {
        if (!videoPCs[id]) {
           videoPCs[id] = new RTCPeerConnection();
        }
        if (videoRefs.current[id] && videoRefs.current[id].srcObject !== ourStreamRef.current) {
          videoRefs.current[id].srcObject = ourStreamRef.current;
        }
        return;
      }

      if (videoPCs[id]) return;

      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      videoPCs[id] = pc;

      ourStreamRef.current?.getTracks().forEach((track) => {
        if (ourStreamRef.current) {
          pc.addTrack(track, ourStreamRef.current);
        }
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(id, { ice: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        if (videoRefs.current[id]) {
          videoRefs.current[id].srcObject = event.streams[0];
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          pc.close();
          delete videoPCsRef.current[id];
          updateWebRTC();
        }
      };

      const isOfferer = selfId < id;
      if (isOfferer) {
        pc.onnegotiationneeded = async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(id, { sdp: pc.localDescription });
        };
      }
    });
  };

  const videoChatMembers = members.filter(m => m.isVideoChat || (m.userId === selfId && inVideoChat));

  if (!socket) return null;

  return (
    <div className={`flex flex-col gap-4 ${className || ""}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" /> Video Chat ({videoChatMembers.length})
        </h3>
        {!inVideoChat ? (
          <Button onClick={setupWebRTC} size="sm" variant="outline" className="gap-2">
            <Video className="w-4 h-4" /> Join Video
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleAudio}
              size="icon"
              variant={isAudioEnabled ? "secondary" : "destructive"}
              className="h-8 w-8 rounded-full"
            >
              {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            <Button
              onClick={toggleVideo}
              size="icon"
              variant={isVideoEnabled ? "secondary" : "destructive"}
              className="h-8 w-8 rounded-full"
            >
              {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            <Button onClick={stopWebRTC} size="sm" variant="destructive" className="ml-2">
              Leave
            </Button>
          </div>
        )}
      </div>

      {videoChatMembers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {videoChatMembers.map((member) => (
            <div key={member.userId} className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shadow-md">
              <video
                ref={(el) => {
                  if (el) videoRefs.current[member.userId] = el;
                }}
                autoPlay
                playsInline
                muted={member.userId === selfId}
                className={`w-full h-full object-cover ${member.userId === selfId ? "scale-x-[-1]" : ""}`}
              />

              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center">
                <span className="text-xs font-medium text-white truncate max-w-[80%] drop-shadow-md">
                  {member.username} {member.userId === selfId ? "(You)" : ""}
                </span>

                {member.userId !== selfId && member.isMuted && (
                  <MicOff className="w-3 h-3 text-red-500 drop-shadow-md" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
