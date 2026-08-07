import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { getInitials, type SystemUser } from "@/lib/panel-permissions"
import { cn } from "@/lib/utils"

type UserAvatarProps = {
  user?: Pick<SystemUser, "name" | "avatar"> | null
  name?: string
  avatar?: string | null
  size?: "default" | "sm" | "lg"
  className?: string
}

export function UserAvatar({
  user,
  name,
  avatar,
  size = "default",
  className,
}: UserAvatarProps) {
  const displayName = user?.name ?? name ?? "User"
  const image = user?.avatar ?? avatar ?? undefined

  return (
    <Avatar size={size} className={cn(className)}>
      {image ? <AvatarImage src={image} alt={displayName} /> : null}
      <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
    </Avatar>
  )
}
