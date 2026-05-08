import { contextBridge, ipcRenderer } from 'electron'

export interface LipSyncConfig {
  audioPath: string
  mouthDir: string
  fps: number
  rhubarbPath: string
  recognizer?: 'pocketSphinx' | 'phonetic'
  extendedShapes?: string
  dialogPath?: string
}

export interface LipSyncResult {
  ok: boolean
  xmlPath?: string
  error?: string
}

export interface PersistedSettings {
  audioPath?: string
  mouthDir?: string
  rhubarbPath?: string
  fps?: number
  recognizer?: 'pocketSphinx' | 'phonetic'
  extendedShapes?: string
  dialogPath?: string
}

const api = {
  openAudioFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFile', [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg'] }]),

  openMouthFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFolder'),

  openRhubarb: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openRhubarb'),

  openDialogFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFile', [{ name: 'Text', extensions: ['txt'] }]),

  saveXml: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveXml'),

  generate: (config: LipSyncConfig): Promise<LipSyncResult> =>
    ipcRenderer.invoke('lipsync:generate', config),

  loadSettings: (): Promise<PersistedSettings> =>
    ipcRenderer.invoke('settings:load'),

  saveSettings: (partial: PersistedSettings): Promise<void> =>
    ipcRenderer.invoke('settings:save', partial)
}

contextBridge.exposeInMainWorld('lipSyncApi', api)

export type LipSyncApi = typeof api
