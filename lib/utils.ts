import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

// Giữ định dạng HH:mm dd/MM/yyyy theo múi giờ môi trường, không phụ thuộc ngôn ngữ UI.
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  return `${TIME_FORMATTER.format(date)} ${DATE_FORMATTER.format(date)}`
}

// Nhận "r, g, b" hoặc "rgb(r, g, b)"; trả undefined nếu màu không hợp lệ để bên gọi dùng màu mặc định.
export function rgbToHex(rgb: string): string | undefined {
  const value = rgb.trim()
  const channels = (value.match(/^rgb\((.*)\)$/i)?.[1] ?? value)
    .split(",")
    .map((channel) => channel.trim())

  if (channels.length !== 3 || channels.some((channel) => !/^\d{1,3}$/.test(channel) || Number(channel) > 255)) {
    return undefined
  }

  return `#${channels.map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}`
}
