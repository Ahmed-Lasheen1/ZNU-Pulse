import { createContext, useContext } from 'react'

// Lives outside App.jsx so pages and Home can import these without a circular dependency.
export const AuthContext = createContext()
export const ModulesContext = createContext()

export function useAuth() { return useContext(AuthContext) }
export function useModules() { return useContext(ModulesContext) }
