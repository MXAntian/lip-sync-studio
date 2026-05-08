export interface LipSyncConfig {
  audioPath: string
  mouthDir: string
  fps: number
  rhubarbPath: string
}

export interface LipSyncResult {
  ok: boolean
  xmlPath?: string
  error?: string
}

interface LipSyncApi {
  openAudioFile: () => Promise<string | null>
  openMouthFolder: () => Promise<string | null>
  openRhubarb: () => Promise<string | null>
  saveXml: () => Promise<string | null>
  generate: (config: LipSyncConfig) => Promise<LipSyncResult>
}

declare global {
  interface Window {
    lipSyncApi: LipSyncApi
  }
}
