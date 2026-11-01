import { useMemo } from 'react'
import { AuthContext, ModulesContext } from '@/core/contexts'

export function AuthContextProvider({ user, signOut, profile, fetchProfile, authLoaded, children }) {
  const value = useMemo(
    () => ({ user, signOut, profile, fetchProfile, authLoaded }),
    [user, signOut, profile, fetchProfile, authLoaded]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function ModulesContextProvider({ modules, modulesLoaded, modulesError, refreshModules, children }) {
  const value = useMemo(
    () => ({ modules, modulesLoaded, modulesError, refreshModules }),
    [modules, modulesLoaded, modulesError, refreshModules]
  )
  return <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>
}
