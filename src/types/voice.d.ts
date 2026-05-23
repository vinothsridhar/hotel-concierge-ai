declare module 'mic' {
  interface MicOptions {
    rate?: string;
    channels?: string;
    bitwidth?: string;
    encoding?: string;
    device?: string;
    exitOnSilence?: number;
    debug?: boolean;
    fileType?: string;
  }

  interface MicInstance {
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    getAudioStream(): NodeJS.ReadableStream;
  }

  function mic(options: MicOptions): MicInstance;
  export = mic;
}
