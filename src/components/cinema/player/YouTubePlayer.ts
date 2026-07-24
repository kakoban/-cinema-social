import { Player } from "./Player";

export class YouTubePlayer implements Player {
  watchPartyYTPlayer: YT.Player | null;
  elId: string;

  constructor(watchPartyYTPlayer: YT.Player | null, elId: string = "youtube-player") {
    this.watchPartyYTPlayer = watchPartyYTPlayer;
    this.elId = elId;
  }

  getCurrentTime = () => {
    return this.watchPartyYTPlayer?.getCurrentTime() ?? 0;
  };

  getDuration = () => {
    return this.watchPartyYTPlayer?.getDuration() ?? 0;
  };

  isMuted = () => {
    return this.watchPartyYTPlayer?.isMuted() ?? false;
  };

  isSubtitled = (): boolean => {
    return false;
  };

  getPlaybackRate = (): number => {
    return this.watchPartyYTPlayer?.getPlaybackRate() ?? 1;
  };

  setPlaybackRate = (rate: number) => {
    this.watchPartyYTPlayer?.setPlaybackRate(rate);
  };

  setSrcAndTime = async (src: string, time: number) => {
    try {
      let url = new window.URL(src);
      // Standard link https://www.youtube.com/watch?v=ID
      let videoId = new URLSearchParams(url.search).get("v");
      // Link shortener https://youtu.be/ID
      let altVideoId = src.split("/").slice(-1)[0].split("?")[0];
      this.watchPartyYTPlayer?.cueVideoById(videoId || altVideoId, time);
    } catch (e) {
      console.error("Invalid YouTube URL:", e);
    }
  };

  playVideo = async () => {
    setTimeout(() => {
      this.watchPartyYTPlayer?.playVideo();
    }, 200);
  };

  pauseVideo = () => {
    this.watchPartyYTPlayer?.pauseVideo();
  };

  seekVideo = (time: number) => {
    this.watchPartyYTPlayer?.seekTo(time, true);
  };

  shouldPlay = () => {
    return (
      this.watchPartyYTPlayer?.getPlayerState() ===
        window.YT?.PlayerState.PAUSED ||
      this.getCurrentTime() === this.getDuration()
    );
  };

  isPlaying = () => {
    if (!this.watchPartyYTPlayer) return false;
    return this.watchPartyYTPlayer.getPlayerState() === window.YT?.PlayerState.PLAYING;
  };

  setMute = (muted: boolean) => {
    if (muted) {
      this.watchPartyYTPlayer?.mute();
    } else {
      this.watchPartyYTPlayer?.unMute();
    }
  };

  setVolume = (volume: number) => {
    this.watchPartyYTPlayer?.setVolume(volume * 100);
  };

  getVolume = (): number => {
    const volume = this.watchPartyYTPlayer?.getVolume();
    return (volume ?? 0) / 100;
  };

  setSubtitleMode = (mode?: TextTrackMode, lang?: string) => {
    if (mode === "showing") {
      //@ts-expect-error
      this.watchPartyYTPlayer?.setOption("captions", "reload", true);
      //@ts-expect-error
      this.watchPartyYTPlayer?.setOption("captions", "track", {
        languageCode: lang ?? "en",
      });
    }
    if (mode === "hidden") {
      //@ts-expect-error
      this.watchPartyYTPlayer?.setOption("captions", "track", {});
    }
  };

  getSubtitleMode = () => {
    return "hidden" as TextTrackMode;
  };

  isReady = () => {
    return Boolean(this.watchPartyYTPlayer);
  };

  stopVideo = () => {
    this.watchPartyYTPlayer?.stopVideo();
  };

  clearState = () => {
    return;
  };

  loadSubtitles = async (src: string) => {
    return;
  };

  syncSubtitles = (sharerTime: number) => {
    return;
  };

  getTimeRanges = (): { start: number; end: number }[] => {
    return [
      {
        start: 0,
        end:
          (this.watchPartyYTPlayer?.getVideoLoadedFraction() ?? 0) *
          this.getDuration(),
      },
    ];
  };

  setLoop = (loop: boolean): void => {
    this.watchPartyYTPlayer?.setLoop(loop);
  };

  getVideoEl = (): HTMLMediaElement | null => {
    return document.getElementById(this.elId) as HTMLMediaElement | null;
  };
}
