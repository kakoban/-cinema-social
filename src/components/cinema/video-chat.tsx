"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { Video, VideoOff, Mic, MicOff, MonitorUp, MonitorOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoChatProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
  members: any[];
}

export function VideoChat({ socket, roomId, userId, members }: VideoChatProps) {
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isScreenActive, setIsScreenActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const createPeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("signal", { to: targetUserId, msg: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(targetUserId, event.streams[0]);
        return newMap;
      });
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionsRef.current.set(targetUserId, pc);
    return pc;
  }, [socket]);

  // Handle incoming signals
  useEffect(() => {
    if (!socket) return;
    
    const handleSignal = async (data: { from: string; msg: any }) => {
      const { from, msg } = data;
      let pc = peerConnectionsRef.current.get(from);
      
      if (!pc) {
        pc = createPeerConnection(from);
      }

      if (msg.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { to: from, msg: pc.localDescription });
      } else if (msg.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg));
      } else if (msg.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(msg));
      }
    };

    socket.on("signal", handleSignal);
    return () => {
      socket.off("signal", handleSignal);
    };
  }, [socket, userId]);

  // Connect to peers who have video chat active
  useEffect(() => {
    if ((!isVideoActive && !isScreenActive) || !socket) return;

    members.forEach(async (member) => {
      if (member.userId !== userId && member.isVideoChat && !peerConnectionsRef.current.has(member.userId)) {
        // Deterministic role assignment based on userId string comparison
        if (userId < member.userId) {
          const pc = createPeerConnection(member.userId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("signal", { to: member.userId, msg: pc.localDescription });
        }
      }
    });

    // Cleanup disconnected peers
    peerConnectionsRef.current.forEach((pc, id) => {
      const isMemberVideoActive = members.find(m => m.userId === id)?.isVideoChat;
      if (!isMemberVideoActive) {
        pc.close();
        peerConnectionsRef.current.delete(id);
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
    });

  }, [members, isVideoActive, isScreenActive, socket, userId, createPeerConnection]);

  const toggleVideo = async () => {
    if (isVideoActive || isScreenActive) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setIsVideoActive(false);
      setIsScreenActive(false);
      socket?.emit("CMD:leaveVideo");

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      setRemoteStreams(new Map());
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsVideoActive(true);
        setIsScreenActive(false);
        setIsMuted(false);
        socket?.emit("CMD:joinVideo");
      } catch (err) {
        console.error("Failed to access media devices", err);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isVideoActive || isScreenActive) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setIsVideoActive(false);
      setIsScreenActive(false);
      socket?.emit("CMD:leaveScreen");

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      setRemoteStreams(new Map());
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

        // Handle user stopping screen share via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
          setIsScreenActive(false);
          socket?.emit("CMD:leaveScreen");
          peerConnectionsRef.current.forEach((pc) => pc.close());
          peerConnectionsRef.current.clear();
          setRemoteStreams(new Map());
        };

        localStreamRef.current = screenStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenActive(true);
        setIsVideoActive(false);
        setIsMuted(false);
        socket?.emit("CMD:joinScreen");
      } catch (err) {
        console.error("Failed to share screen", err);
      }
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const currentMute = !isMuted;
        audioTracks[0].enabled = !currentMute;
        setIsMuted(currentMute);
        socket?.emit("CMD:userMute", { isMuted: currentMute });
      }
    }
  };

  // Bind stream to remote video elements
  const setRemoteVideoRef = (id: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideosRef.current.set(id, el);
      const stream = remoteStreams.get(id);
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    }
  };

  if (!isVideoActive && !isScreenActive && members.filter(m => m.isVideoChat && m.userId !== userId).length === 0) {
     return (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleVideo} className="gap-2">
              <Video className="size-4" /> Start Video Chat
          </Button>
          <Button variant="outline" size="sm" onClick={toggleScreenShare} className="gap-2">
              <MonitorUp className="size-4" /> Share Screen
          </Button>
        </div>
     );
  }

  return (
    <div className="mt-4 flex flex-col gap-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">Video Chat & Screen Share</h3>
        <div className="flex gap-2">
          <Button variant={isMuted ? "destructive" : "secondary"} size="icon" onClick={toggleMute} disabled={!isVideoActive && !isScreenActive}>
            {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Button variant={isScreenActive ? "destructive" : "secondary"} size="icon" onClick={toggleScreenShare} disabled={isVideoActive}>
            {isScreenActive ? <MonitorOff className="size-4" /> : <MonitorUp className="size-4" />}
          </Button>
          <Button variant={isVideoActive ? "destructive" : "default"} size="icon" onClick={toggleVideo} disabled={isScreenActive}>
            {isVideoActive ? <VideoOff className="size-4" /> : <Video className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {(isVideoActive || isScreenActive) && (
          <div className="relative aspect-video bg-black rounded overflow-hidden shadow-lg border border-border">
             <video ref={localVideoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover", isVideoActive && "transform -scale-x-100")} />
             <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">You {isScreenActive ? "(Screen)" : ""}</div>
          </div>
        )}

        {Array.from(remoteStreams.entries()).map(([id, stream]) => {
          const member = members.find(m => m.userId === id);
          return (
            <div key={id} className="relative aspect-video bg-black rounded overflow-hidden shadow-lg border border-border">
               <video
                 ref={(el) => setRemoteVideoRef(id, el)}
                 autoPlay
                 playsInline
                 className="w-full h-full object-cover"
               />
               <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                 {member?.username || id}
                 {member?.isMuted && <MicOff className="size-3 inline ml-1 text-red-500" />}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
