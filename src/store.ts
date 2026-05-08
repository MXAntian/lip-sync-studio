import { create } from 'zustand'

type Recognizer = 'pocketSphinx' | 'phonetic'

interface AppState {
  audioPath: string
  mouthDir: string
  rhubarbPath: string
  fps: number

  // Rhubarb advanced options
  recognizer: Recognizer
  extendedShapes: string  // '' / 'X' / 'GX' / 'GHX'
  dialogPath: string      // 空字符串 = 不使用

  status: 'idle' | 'running' | 'done' | 'error'
  statusText: string
  resultPath: string | null

  setAudioPath: (p: string) => void
  setMouthDir: (p: string) => void
  setRhubarbPath: (p: string) => void
  setFps: (f: number) => void
  setRecognizer: (r: Recognizer) => void
  setExtendedShapes: (s: string) => void
  setDialogPath: (p: string) => void
  setStatus: (s: 'idle' | 'running' | 'done' | 'error', text?: string) => void
  setResultPath: (p: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  audioPath: '',
  mouthDir: '',
  rhubarbPath: '',
  fps: 30,

  recognizer: 'pocketSphinx',
  extendedShapes: 'GHX',
  dialogPath: '',

  status: 'idle',
  statusText: '',
  resultPath: null,

  setAudioPath: (p) => set({ audioPath: p }),
  setMouthDir: (p) => set({ mouthDir: p }),
  setRhubarbPath: (p) => set({ rhubarbPath: p }),
  setFps: (f) => set({ fps: f }),
  setRecognizer: (r) => set({ recognizer: r }),
  setExtendedShapes: (s) => set({ extendedShapes: s }),
  setDialogPath: (p) => set({ dialogPath: p }),
  setStatus: (s, text = '') => set({ status: s, statusText: text }),
  setResultPath: (p) => set({ resultPath: p })
}))
