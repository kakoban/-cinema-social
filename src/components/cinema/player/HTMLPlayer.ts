import { Player } from "./Player";

export class HTMLPlayer implements Player {
  elId: string;

  constructor(elId: string) {
    this.elId = elId;
  }

  getVideoEl = (): HTMLMediaElement | null => {
    return document.getElementById(this.elId) as HTMLMediaElement | null;
  };

  getCurrentTime = () => {
    return this.getVideoEl()?.currentTime ?? 0;
  };

  getDuration = () => {
    return this.getVideoEl()?.duration ?? 0;
  };

  isMuted = () => {
    return this.getVideoEl()?.muted ?? false;
  };

  isSubtitled = () => {
    return this.getSubtitleMode() === "showing";
  };

  getPlaybackRate = (): number => {
    return this.getVideoEl()?.playbackRate ?? 1;
  };

  setPlaybackRate = (rate: number) => {
    const el = this.getVideoEl();
    if (el) {
      el.playbackRate = rate;
    }
  };

  setSrcAndTime = async (src: string, time: number) => {
    const el = this.getVideoEl();
    if (el) {
      el.currentTime = time;
      el.src = src;
    }
  };

  playVideo = async () => {
    const el = this.getVideoEl();
    if (el) {
      await el.play();
    }
  };

  pauseVideo = () => {
    const el = this.getVideoEl();
    if (el) {
      el.pause();
    }
  };

  seekVideo = (time: number) => {
    const el = this.getVideoEl();
    if (el) {
      el.currentTime = time;
    }
  };

  shouldPlay = () => {
    const el = this.getVideoEl();
    return Boolean(el?.paused || el?.ended);
  };

  isPlaying = () => {
    const el = this.getVideoEl();
    if (!el) return false;
    return Boolean(!el.paused && !el.ended);
  };

  setMute = (muted: boolean) => {
    const el = this.getVideoEl();
    if (el) {
      el.muted = muted;
    }
  };

  setVolume = (volume: number) => {
    const el = this.getVideoEl();
    if (el) {
      el.volume = volume;
    }
  };

  getVolume = (): number => {
    return this.getVideoEl()?.volume ?? 1;
  };

  setSubtitleMode = (mode?: TextTrackMode) => {
    const el = this.getVideoEl();
    if (el && el.textTracks) {
      for (let i = 0; i < Math.min(el.textTracks.length, 1); i++) {
        el.textTracks[i].mode =
          mode ??
          (el.textTracks[i].mode === "hidden" ? "showing" : "hidden");
      }
    }
  };

  getSubtitleMode = () => {
    const el = this.getVideoEl();
    return el?.textTracks[0]?.mode ?? "hidden";
  };

  isReady = () => {
    return Boolean(this.getVideoEl());
  };

  clearState = () => {
    const el = this.getVideoEl();
    if (el) {
      el.src = "";
      el.srcObject = null;
      this.setSubtitleMode("hidden");
      const tracks = el.querySelectorAll("track");
      tracks.forEach((t) => t.remove());
    }
  };

  loadSubtitles = async (src: string) => {
    const el = this.getVideoEl();
    if (!el) return;

    // Remove existing track elements
    const existingTracks = el.querySelectorAll("track");
    existingTracks.forEach((t) => t.remove());

    if (src) {
      try {
        const track = document.createElement("track");
        track.kind = "subtitles";
        track.label = "فارسی";
        track.srclang = "fa";
        track.src = src;
        track.default = true;
        el.appendChild(track);

        if (el.textTracks && el.textTracks.length > 0) {
          el.textTracks[0].mode = "showing";
        }
      } catch (e) {
        console.error("Failed to load subtitles:", e);
      }
    }
  };

  syncSubtitles = (sharerTime: number) => {
    const el = this.getVideoEl();
    if (!el) return;

    const track = el.textTracks[0];
    const offset = el.currentTime - sharerTime;
    if (track && track.cues && offset) {
      for (let i = 0; i < track.cues.length; i++) {
        const cue = track.cues[i] as TextTrackCue & {
          origStart?: number;
          origEnd?: number;
        };

        if (!cue) continue;

        if (typeof cue.origStart === "undefined") {
          cue.origStart = cue.startTime;
          cue.origEnd = cue.endTime;
        }
        cue.startTime = cue.origStart + offset;
        cue.endTime = (cue.origEnd || cue.endTime) + offset;
      }
    }
  };

  getTimeRanges = (): { start: number; end: number }[] => {
    const el = this.getVideoEl();
    const buffers: { start: number; end: number }[] = [];
    if (el) {
      const rangeCount = el.buffered.length;
      for (let i = 0; i < rangeCount; i++) {
        buffers.push({
          start: el.buffered.start(i),
          end: el.buffered.end(i)
        });
      }
    }
    return buffers;
  };

  setLoop = (loop: boolean): void => {
    const el = this.getVideoEl();
    if (el) {
      el.loop = loop;
    }
  };
}
