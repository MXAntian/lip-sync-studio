import { create } from 'zustand'

interface AppState {
  audioPath: string
  mouthDir: string
  rhubarbPath: string
  fps: number
  status: 'idle' | 'running' | 'done' | 'error'
  statusText: string
  resultPath: string | null

  setAudioPath: (p: string) => void
  setMouthDir: (p: string) => void
  setRhubarbPath: (p: string) => void
  setFps: (f: number) => void
  setStatus: (s: 'idle' | 'running' | 'done' | 'error', text?: string) => void
  setResultPath: (p: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  audioPath: '',
  mouthDir: '',
  rhubarbPath: '',
  fps: 30,
  status: 'idle',
  statusText: '',
  resultPath: null,

  setAudioPath: (p) => set({ audioPath: p }),
  setMouthDir: (p) => set({ mouthDir: p }),
  setRhubarbPath: (p) => set({ rhubarbPath: p }),
  setFps: (f) => set({ fps: f }),
  setStatus: (s, text = '') => set({ status: s, statusText: text }),
  setResultPath: (p) => set({ resultPath: p })
}))
