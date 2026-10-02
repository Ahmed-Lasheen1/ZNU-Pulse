import { createContext, useContext } from 'react'

// Live outside App.jsx so pages can import them without a circular dependency.
export const AuthContext = createContext()
export const ModulesContext = createContext()

// Home entrance signal, shared by Home and the site header.
//   playEntrance - true only while Home is shown the first time after a page load
//   entranceRun  - 0 until that moment, then 1 (used as a React key by the header)
export const HomeEntranceContext = createContext({ playEntrance: false, entranceRun: 0 })

export function useAuth() { return useContext(AuthContext) }
export function useModules() { return useContext(ModulesContext) }
export function useHomeEntrance() { return useContext(HomeEntranceContext) }
