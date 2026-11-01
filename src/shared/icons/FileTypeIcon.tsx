import { VideoIcon, AudioIcon, DocumentIcon, PlayIcon } from '@/shared/icons/tool-icons'

interface FileTypeIconProps {
  type: string
  color: string
  size?: number
}

export function FileTypeIcon({ type, color, size = 14 }: FileTypeIconProps) {
  if (type === 'video') return <VideoIcon color={color} size={size} />
  if (type === 'audio') return <AudioIcon color={color} size={size} />
  return <DocumentIcon color={color} size={size} />
}

export function FileActionIcon({ type, color, size = 12 }: FileTypeIconProps) {
  if (type === 'video') return <PlayIcon color={color} size={size} />
  if (type === 'audio') return <AudioIcon color={color} size={size} />
  return <DocumentIcon color={color} size={size} />
}

export function fileActionLabel(type: string) {
  return type === 'video' ? 'Play' : type === 'audio' ? 'Listen' : 'Open'
}
