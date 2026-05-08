import { contextBridge, ipcRenderer } from 'electron'

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

const api = {
  openAudioFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFile', [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg'] }]),
  
  openMouthFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFolder'),
  
  openRhubarb: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openRhubarb'),
  
  saveXml: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveXml'),
  
  generate: (config: LipSyncConfig): Promise<LipSyncResult> =>
    ipcRenderer.invoke('lipsync:generate', config)
}

contextBridge.exposeInMainWorld('lipSyncApi', api)

export type LipSyncApi = typeof api
