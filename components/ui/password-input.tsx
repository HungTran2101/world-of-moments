"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, "type"> {
  visibilityLabels?: { show: string; hide: string }
}

function PasswordInput({
  className,
  disabled,
  visibilityLabels = { show: "Show password", hide: "Hide password" },
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false)
  const label = visible ? visibilityLabels.hide : visibilityLabels.show

  return (
    <div className="relative w-full" data-slot="password-input">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-10", className)}
      />
      <Button
        type="button"
        tabIndex={-1}
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1 -translate-y-1/2 border-0 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={disabled}
        aria-label={label}
        aria-controls={props.id}
        title={label}
        onMouseDown={(event) => {
          // Giữ con trỏ trong ô khi bấm biểu tượng.
          event.preventDefault()
        }}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  )
}

export { PasswordInput }
